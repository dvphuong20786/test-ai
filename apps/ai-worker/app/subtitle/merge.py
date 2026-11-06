from dataclasses import dataclass
import re


@dataclass(frozen=True)
class OcrSample:
    timestamp_ms: int
    text: str
    confidence: float


def merge_adjacent_samples(samples: list[OcrSample], max_gap_ms: int = 750) -> list[dict]:
    segments: list[dict] = []
    for sample in sorted(samples, key=lambda current_sample: current_sample.timestamp_ms):
        normalized_text = re.sub(r"[\s，。！？、,.!?;；:：…]", "", sample.text)
        if not normalized_text:
            continue

        previous_segment = segments[-1] if segments else None
        is_same_adjacent_text = (
            previous_segment is not None
            and previous_segment["normalized_text"] == normalized_text
            and sample.timestamp_ms - previous_segment["last_sample_ms"] <= max_gap_ms
        )
        if is_same_adjacent_text:
            previous_segment["end_ms"] = sample.timestamp_ms + max_gap_ms
            previous_segment["last_sample_ms"] = sample.timestamp_ms
            previous_segment["confidence_total"] += sample.confidence
            previous_segment["sample_count"] += 1
            continue

        if previous_segment is not None:
            previous_segment["end_ms"] = min(previous_segment["end_ms"], sample.timestamp_ms)

        segments.append({
            "text": sample.text.strip(),
            "normalized_text": normalized_text,
            "start_ms": sample.timestamp_ms,
            "end_ms": sample.timestamp_ms + max_gap_ms,
            "last_sample_ms": sample.timestamp_ms,
            "confidence_total": sample.confidence,
            "sample_count": 1,
        })

    return [
        {
            "start_ms": segment["start_ms"],
            "end_ms": segment["end_ms"],
            "text": segment["text"],
            "confidence": segment["confidence_total"] / segment["sample_count"],
        }
        for segment in segments
    ]
