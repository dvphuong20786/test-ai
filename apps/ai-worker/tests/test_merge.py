import unittest

from app.subtitle.merge import OcrSample, merge_adjacent_samples


class MergeAdjacentSamplesTest(unittest.TestCase):
    def test_merges_only_adjacent_duplicate_text(self):
        samples = [
            OcrSample(0, "你好", 0.8),
            OcrSample(500, "你好", 0.9),
            OcrSample(5000, "你好", 0.95),
        ]

        segments = merge_adjacent_samples(samples)

        self.assertEqual(len(segments), 2)
        self.assertEqual(segments[0]["start_ms"], 0)
        self.assertAlmostEqual(segments[0]["confidence"], 0.85)
        self.assertEqual(segments[1]["start_ms"], 5000)

    def test_ignores_blank_ocr_samples(self):
        segments = merge_adjacent_samples([OcrSample(0, "  ", 0.2)])
        self.assertEqual(segments, [])


if __name__ == "__main__":
    unittest.main()
