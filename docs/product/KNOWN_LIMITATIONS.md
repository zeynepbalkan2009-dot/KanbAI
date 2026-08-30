# Known Limitations

This document describes the current technical limitations of KanbAI. These are intentionally stated explicitly so that the public repository does not overstate validation or production readiness.

1. **Local Docker runtime:** Docker runtime tests are in place, but rebuild stability still depends on the host having sufficient free disk space for images and volumes.
2. **Database migrations:** The initial Alembic migration is present. A controlled migration strategy must be maintained for every future schema change before production deployment.
3. **AI inference:** The pilot can run in mock/demo inference mode. Real YOLO model weights and calibration still need to be connected to and validated against factory-specific data.
4. **Thumbnail optimization:** The thumbnail currently uses the original object key. A dedicated preview/optimization worker is planned for a later iteration.
5. **Mobile runtime:** The Expo mobile workflow requires dependency installation and a physical device or simulator for runtime validation.
6. **Production model performance:** No production accuracy, precision, recall or defect-detection KPI is claimed by this repository until measured on representative factory data.
7. **Factory-specific labeling:** The continuous-learning workflow depends on sufficient, correctly labeled inspection examples and consistent human validation.
