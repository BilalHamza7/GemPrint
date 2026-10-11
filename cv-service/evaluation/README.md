# GemPrint Evaluation Runner

Run the production CLAHE → SIFT → FLANN → RANSAC pipeline against the 30 enrolled and 30 altered images. The runner creates 900 comparisons: 30 genuine and 870 impostor attempts.

## Dataset layout

```text
GemPrint_Evaluation/
├── enrolment/gem_base_01.png ... gem_base_30.png
└── verification/
    ├── rotation/gem_query_01.png ... gem_query_10.png
    ├── glare/gem_query_11.png ... gem_query_20.png
    └── crop/gem_query_21.png ... gem_query_30.png
```

The image number identifies the genuine pair. For example, `gem_query_14.png` is the genuine query for `gem_base_14.png`; all other 29 baseline comparisons are impostor attempts.

## Google Colab

```python
from google.colab import drive
drive.mount('/content/drive')

!git clone --depth 1 https://github.com/BilalHamza7/GemPrint.git
%cd /content/GemPrint
!pip install -r cv-service/requirements.txt matplotlib

!cp -r /content/drive/MyDrive/GemPrint_Evaluation /content/GemPrint/evaluation_data

!python cv-service/evaluation/run_evaluation.py \
  --enrolment-dir evaluation_data/enrolment \
  --verification-dir evaluation_data/verification \
  --output-dir evaluation_output

!cp -r evaluation_output /content/drive/MyDrive/GemPrint_Evaluation/
```

## Outputs

- `comparison_results.csv`: all 900 scores, verdicts and measured stage timings.
- `threshold_metrics.csv`: FAR, FRR and accuracy across the existing inlier-ratio threshold sweep.
- `summary.json` and `summary.md`: thesis-ready aggregate results.
- `far_frr_threshold_sweep.png`: FAR/FRR threshold chart, when matplotlib is installed.

By default, the runner uses the full source image and standardizes it using the production 1280 × 960 ROI rule. This avoids introducing unreported image preprocessing during the initial thesis evaluation.
