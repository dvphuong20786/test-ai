from typing import Literal

from pydantic import BaseModel, Field, model_validator


class NormalizedRegion(BaseModel):
    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)
    width: float = Field(gt=0, le=1)
    height: float = Field(gt=0, le=1)

    @model_validator(mode="after")
    def validate_bounds(self):
        if self.x + self.width > 1 or self.y + self.height > 1:
            raise ValueError("Vùng phụ đề phải nằm hoàn toàn trong khung hình")
        return self


class RemovalSettings(BaseModel):
    method: Literal["TELEA", "NS"] = "TELEA"
    inpaintRadius: int = Field(default=3, ge=1, le=15)
    maskDilation: int = Field(default=3, ge=0, le=15)
    edgeFeathering: int = Field(default=1, ge=0, le=8)


class RemovalPreviewRequest(BaseModel):
    sourcePath: str = Field(min_length=1)
    timestampMs: int = Field(default=0, ge=0)
    regions: list[NormalizedRegion] = Field(min_length=1, max_length=8)
    settings: RemovalSettings = RemovalSettings()


class DetectedBox(BaseModel):
    x: int
    y: int
    width: int
    height: int


class RemovalPreviewResponse(BaseModel):
    originalImage: str
    processedImage: str
    maskImage: str
    maskCoverage: float
    suspicious: bool
    warnings: list[str]
    detectedBoxes: list[DetectedBox]
