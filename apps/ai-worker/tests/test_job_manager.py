import tempfile
import time
import unittest
import os
from pathlib import Path
from unittest.mock import patch

# Argos cần thư mục cấu hình có quyền ghi khi module pipeline được import trong sandbox kiểm thử.
os.environ["XDG_CONFIG_HOME"] = str(Path(tempfile.gettempdir()) / "vietdub-test-config")

from app.models.ocr import OcrRegion
from app.models.pipeline import AutomaticPipelineRequest, AutomaticPipelineResponse
from app.services import job_manager


class JobManagerTest(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.previous_job_directory = job_manager._thu_muc_cong_viec
        job_manager._thu_muc_cong_viec = Path(self.temporary_directory.name)
        job_manager._cac_cong_viec.clear()
        self.request = AutomaticPipelineRequest(
            projectId="project-test", sourcePath="video-test.mp4",
            region=OcrRegion(x=0.1, y=0.7, width=0.8, height=0.2),
        )

    def tearDown(self):
        job_manager._thu_muc_cong_viec = self.previous_job_directory
        job_manager._cac_cong_viec.clear()
        self.temporary_directory.cleanup()

    def _wait_for_terminal_status(self, job_id: str) -> dict:
        for _ in range(100):
            job = job_manager.lay_cong_viec(job_id)
            if job and job["status"] in {"COMPLETED", "FAILED", "CANCELLED"}:
                return job
            time.sleep(0.01)
        self.fail("Công việc không chuyển sang trạng thái kết thúc")

    def test_emits_real_stage_progress_and_persists_completed_job(self):
        def fake_pipeline(_request, report_progress, save_partial):
            report_progress("OCR", 1, 2)
            save_partial("OCR", [])
            report_progress("OCR", 2, 2)
            return AutomaticPipelineResponse(outputPath="output.mp4", segments=[], completedSteps=["ocr"])

        with patch.object(job_manager, "process_automatic_pipeline", side_effect=fake_pipeline):
            created_job = job_manager.tao_cong_viec_pipeline(self.request)
            completed_job = self._wait_for_terminal_status(created_job["id"])

        self.assertEqual(completed_job["status"], "COMPLETED")
        self.assertTrue((Path(self.temporary_directory.name) / f"{created_job['id']}.json").is_file())

    def test_cancels_job_at_safe_progress_checkpoint(self):
        def slow_pipeline(_request, report_progress, _save_partial):
            for processed in range(1, 20):
                report_progress("INPAINT", processed, 20)
                time.sleep(0.01)
            return AutomaticPipelineResponse(outputPath="output.mp4", segments=[], completedSteps=[])

        with patch.object(job_manager, "process_automatic_pipeline", side_effect=slow_pipeline):
            created_job = job_manager.tao_cong_viec_pipeline(self.request)
            time.sleep(0.03)
            job_manager.huy_cong_viec(created_job["id"])
            cancelled_job = self._wait_for_terminal_status(created_job["id"])

        self.assertEqual(cancelled_job["status"], "CANCELLED")

    def test_reuses_running_job_for_same_project(self):
        def slow_pipeline(_request, report_progress, _save_partial):
            report_progress("OCR", 1, 2)
            time.sleep(0.08)
            return AutomaticPipelineResponse(outputPath="output.mp4", segments=[], completedSteps=[])

        with patch.object(job_manager, "process_automatic_pipeline", side_effect=slow_pipeline):
            first_job = job_manager.tao_cong_viec_pipeline(self.request)
            second_job = job_manager.tao_cong_viec_pipeline(self.request)
            self._wait_for_terminal_status(first_job["id"])

        self.assertEqual(first_job["id"], second_job["id"])

    def test_persists_partial_results_before_later_stage_completes(self):
        def fake_pipeline(_request, report_progress, save_partial):
            report_progress("OCR", 1, 1)
            save_partial("OCR", [])
            raise RuntimeError("Lỗi giả lập sau OCR")

        with patch.object(job_manager, "process_automatic_pipeline", side_effect=fake_pipeline):
            created_job = job_manager.tao_cong_viec_pipeline(self.request)
            failed_job = self._wait_for_terminal_status(created_job["id"])

        self.assertEqual(failed_job["status"], "FAILED")
        self.assertEqual(failed_job["partialVersion"], 1)
        self.assertEqual(failed_job["partialStage"], "OCR")


if __name__ == "__main__":
    unittest.main()
