import unittest
import tempfile
from pathlib import Path

try:
    import cv2
    import numpy as np
    from app.subtitle_removal.models import NormalizedRegion, RemovalSettings
    from app.subtitle_removal.opencv_inpaint import OpenCvInpaintingEngine
    from app.subtitle_removal.restoration_pipeline import RestorationPipeline
    from app.subtitle_removal.models import RemovalPreviewRequest
    from app.subtitle_removal.roi import normalized_to_pixel_bounds
    from app.subtitle_removal.temporal_consistency import mask_intersection_over_union
    from app.subtitle_removal.mask_generator import TextMaskGenerator
    DEPENDENCIES_AVAILABLE = True
except ModuleNotFoundError:
    DEPENDENCIES_AVAILABLE = False


@unittest.skipUnless(DEPENDENCIES_AVAILABLE, "Môi trường kiểm tra chưa cài NumPy/OpenCV/Pydantic")
class SubtitleRemovalTest(unittest.TestCase):
    def test_converts_normalized_region_to_pixels(self):
        region = NormalizedRegion(x=0.1, y=0.7, width=0.8, height=0.2)
        self.assertEqual(normalized_to_pixel_bounds(region, 1920, 1080), (192, 756, 1728, 972))

    def test_opencv_inpaint_preserves_frame_dimensions(self):
        frame = np.full((80, 160, 3), 120, dtype=np.uint8)
        mask = np.zeros((80, 160), dtype=np.uint8)
        cv2.putText(mask, "TEST", (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, 255, 2)
        result = OpenCvInpaintingEngine(RemovalSettings()).process_frame(frame, mask)
        self.assertEqual(result.shape, frame.shape)

    def test_temporal_iou_detects_stable_mask(self):
        mask = np.zeros((20, 20), dtype=np.uint8)
        mask[5:10, 5:10] = 255
        self.assertEqual(mask_intersection_over_union(mask, mask), 1.0)

    def test_pipeline_processes_synthetic_video_frame(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            video_path = Path(temporary_directory) / "video kiểm thử.avi"
            writer = cv2.VideoWriter(str(video_path), cv2.VideoWriter_fourcc(*"MJPG"), 5, (320, 180))
            for frame_index in range(5):
                frame = np.full((180, 320, 3), (40 + frame_index * 3, 70, 90), dtype=np.uint8)
                cv2.putText(frame, "TEST SUBTITLE", (65, 155), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2)
                writer.write(frame)
            writer.release()

            request = RemovalPreviewRequest(
                sourcePath=str(video_path),
                timestampMs=200,
                regions=[NormalizedRegion(x=0.1, y=0.68, width=0.8, height=0.25)],
            )
            result = RestorationPipeline().process_preview(request)

            self.assertGreater(result.maskCoverage, 0)
            self.assertTrue(result.originalImage.startswith("data:image/jpeg;base64,"))
            self.assertTrue(result.processedImage.startswith("data:image/jpeg;base64,"))
            self.assertTrue(result.maskImage.startswith("data:image/png;base64,"))

    def test_mask_excludes_large_bright_non_text_object(self):
        frame = np.full((240, 480, 3), 25, dtype=np.uint8)
        cv2.rectangle(frame, (190, 90), (290, 225), (245, 245, 245), -1)
        cv2.putText(frame, "SUBTITLE", (120, 215), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
        mask, boxes = TextMaskGenerator().generate(
            frame,
            [NormalizedRegion(x=0.1, y=0.35, width=0.8, height=0.6)],
            RemovalSettings(maskDilation=1),
        )
        large_object_coverage = np.count_nonzero(mask[90:180, 190:290])
        subtitle_coverage = np.count_nonzero(mask[190:225, 120:360])
        self.assertEqual(large_object_coverage, 0)
        self.assertGreater(subtitle_coverage, 0)
        self.assertGreater(len(boxes), 0)

    def test_mask_excludes_bright_vertical_stripes_above_subtitle(self):
        frame = np.full((240, 480, 3), 25, dtype=np.uint8)
        for stripe_x in range(210, 290, 14):
            cv2.line(frame, (stripe_x, 70), (stripe_x - 45, 175), (250, 250, 250), 5)
        cv2.putText(frame, "WIDE SUBTITLE TEXT", (75, 215), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (255, 255, 255), 2)

        mask, _ = TextMaskGenerator().generate(
            frame,
            [NormalizedRegion(x=0.1, y=0.25, width=0.8, height=0.7)],
            RemovalSettings(maskDilation=1),
        )

        self.assertEqual(np.count_nonzero(mask[70:175, 150:300]), 0)
        self.assertGreater(np.count_nonzero(mask[190:225, 60:420]), 0)


if __name__ == "__main__":
    unittest.main()
