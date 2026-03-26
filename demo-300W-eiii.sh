IMAGE_PATH="${1:-/Users/tanya/bs/STAR/my_image.jpg}"
OUTPUT_PATH="${2:-/Users/tanya/eiii-demo/src/result_dir/demo_result.jpg}"
DEMO_PY="/Users/tanya/bs/STAR/demo.py"
PYTHON_BIN="${STAR_PYTHON:-python}"
"${PYTHON_BIN}" "${DEMO_PY}" --device_ids=0 \
  --ckpt_dir=/Users/tanya/bs/STAR/ckpts \
  --data_definition=300W \
  --predictor_path=/Users/tanya/bs/STAR/models/shape_predictor_68_face_landmarks.dat \
  --model_path=/Users/tanya/bs/STAR/models/300W_STARLoss_NME_2_87.pkl \
  --image_path="${IMAGE_PATH}" \
  --output_path="${OUTPUT_PATH}" \
  --no_show
