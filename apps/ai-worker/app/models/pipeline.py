from pydantic import BaseModel, Field

from app.models.ocr import OcrRegion, OcrSegment


class AutomaticPipelineRequest(BaseModel):
    projectId: str
    sourcePath: str = Field(min_length=1)
    region: OcrRegion


class AutomaticPipelineResponse(BaseModel):
    outputPath: str
    segments: list[OcrSegment]
    completedSteps: list[str]


class PreviewProxyRequest(BaseModel):
    projectId: str
    sourcePath: str = Field(min_length=1)


class SegmentVoiceRequest(BaseModel):
    projectId: str
    segmentId: str
    text: str = Field(min_length=1)
