# ML Models directory
# 
# This folder stores trained model files saved by joblib.
# Files are generated at runtime — do not commit to git.
#
# Files created here automatically:
#   embedder.joblib        — sentence-transformer model cache
#   pfi_model.joblib       — trained GradientBoosting PFI predictor
#   pfi_scaler.joblib      — MinMaxScaler for PFI features
#   yolov8n.pt             — YOLOv8 nano weights (downloaded by ultralytics)
#
# To retrain PFI model after getting 20+ completed contracts:
#   POST /ml/pfi/train  (admin only)
