from pydantic import BaseModel, Field, model_validator


class OcrRegion(BaseModel):
    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)
    width: float = Field(gt=0, le=1)
    height: float = Field(gt=0, le=1)

    @model_validator(mode="after")
    def validate_bounds(self):
        if self.x + self.width > 1 or self.y + self.height > 1:
            raise ValueError("Vùng OCR phải nằm trong khung hình")
        return self


class OcrRequest(BaseModel):
    projectId: str
    sourcePath: str
    region: OcrRegion


class OcrSegment(BaseModel):
    id: str
    startMs: int
    endMs: int
    originalText: str
    translatedText: str = ""
    ocrConfidence: float | None = None
    status: str = "DETECTED"


class OcrResponse(BaseModel):
    segments: list[OcrSegment]
