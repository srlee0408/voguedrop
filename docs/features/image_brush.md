PROMPT FLUX FILL API (BFL)
프롬프트를 같이 보내주셔야합니다.
마스크 부분을 흰색으로 해주시면 됩니다.


import base64
import json
import time
from openai import OpenAI
import requests
import random
from io import BytesIO
from PIL import Image
import concurrent.futures
from datetime import datetime

# API 키 설정
BFL_TOKEN = ''

# FLUX API 엔드포인트
FLUX_URL = "https://api.us1.bfl.ai/v1/flux-pro-1.0-fill"
RESULT_URL = "https://api.us1.bfl.ai/v1/get_result"

# 이미지 경로
input_path = "input.png"
mask_path = "mask.png"


def save_image(result_data, filename):
    if not result_data:
        print(f"저장할 이미지 데이터가 없습니다: {filename}")
        return False

    # API 응답 구조에 따라 이미지 URL 추출
    image_url = result_data.get('sample')
    if not image_url:
        image_url = result_data.get('url') or result_data.get('image_url')

    if image_url:
        try:
            response = requests.get(image_url)
            response.raise_for_status()

            with open(filename, "wb") as f:
                f.write(response.content)

            return True
        except Exception as e:
            print(f"이미지 저장 실패 ({filename}): {e}")
            return False
    else:
        print(f"이미지 URL을 찾을 수 없습니다: {filename}")
        return False


def pil_to_b64(pil_img):
    buffered = BytesIO()
    pil_img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
    return img_str


def generate_single_image(prompt, image_b64, mask_b64, seed):
    """단일 이미지 생성 함수"""

    # API 요청 생성
    gen_query = {
        "prompt": prompt,
        "seed": seed,
        "image": image_b64,
        "mask": mask_b64,
        "guaidance": 80,
        "output_format": "png",
        "safety_tolerance": 2,
        "prompt_upsampling": False,
    }

    headers = {
        "Content-Type": "application/json",
        "X-Key": BFL_TOKEN,
    }

    try:
        response = requests.post(FLUX_URL, headers=headers, json=gen_query)

        if response.status_code == 200:
            response_data = response.json()
            gen_id = response_data.get("id")
            print(f"생성 ID: {gen_id}")

            # 결과 확인
            result_headers = {"X-Key": BFL_TOKEN}
            result_query = {"id": gen_id}

            while True:
                result_response = requests.get(
                    RESULT_URL, headers=result_headers, params=result_query
                )

                if result_response.status_code == 200:
                    result = result_response.json()
                    status = result.get("status")

                    if status == "Ready":
                        print(f"생성 완료!")
                        return result.get("result")
                    elif status == "Pending":
                        print(f"처리 중... 대기 중...")
                        time.sleep(2)
                    elif status in ["Task not found", "Request Moderated", "Content Moderated", "Error"]:
                        print(f"오류 발생: {status}")
                        if status == "Error":
                            print(
                                f"상세 오류: {result.get('error', 'Unknown error')}")
                        return None
                else:
                    print(
                        f"결과 확인 실패: {result_response.status_code}")
                    return None
        else:
            print(f"생성 요청 실패: {response.status_code}")
            print(f"응답: {response.text}")
            return None

    except Exception as e:
        print(f"예외 발생: {e}")
        return None


# 메인 실행 부분
if __name__ == "__main__":

    try:
        # 입력 이미지 로드 및 base64 인코딩
        image = Image.open(input_path)
        image_b64 = pil_to_b64(image)
        mask = Image.open(mask_path)
        mask_b64 = pil_to_b64(mask)

        # 시드 생성
        seed = random.randint(0, 999999)

        # 유저 프롬프트
        prompt = "expand t-shirt part."

        # 이미지 생성
        result_data = generate_single_image(
            prompt,
            image_b64, mask_b64,
            seed
        )

        # 결과 저장
        if result_data:
            filename = "inpaint_flux.png"
            if save_image(result_data, filename):
                print(f"이미지 저장 성공: {filename}")
            else:
                print("이미지 저장 실패")
        else:
            print("이미지 생성 실패")

    except Exception as e:
        print(f"입력 이미지 로드 실패: {e}")

​
I2I RUNPOD FLUX FILL API (BFL)
RUNPOD_API_KEY = ""
RUNPOD_ENDPOINT_ID = "" #
POST RUNPOD_API_URL = f"https://api.runpod.ai/v2/{RUNPOD_ENDPOINT_ID}/run"
​
파라미터
json 파일 내 {seed} 에 해당하는 부분에 랜덤 숫자로 대체 ( 겹치지 않게 )
requrest_data image/mask 명 바뀌지 않게.
mask는 알파값이 0인 부분에 적용됨
request_data = {
    "input": {
        "workflow": json_data, # json 텍스트를 그대로 넣으면 됨.
        "images": [
            {
                "name": "input-1.png", # 인페인트될 옷 혹은 텍스처
                "image": base 64 encoded_string
            },
                        {
                "name": "input-2.png", # 인페인트 당할 레퍼런스
                "image": base 64 encoded_string
            },
                        {
                "name": "mask.png", # 인페인트 당할 레퍼런스 중 인페인트될 부분
                "image": base 64 encoded_string
            }
        ]
    }
}

​
code
import json
import base64
import requests
import time
import os
from datetime import datetime


# RunPod API 설정
RUNPOD_API_KEY = ""  # API 키
RUNPOD_ENDPOINT_ID = ""

if not RUNPOD_API_KEY or not RUNPOD_ENDPOINT_ID:
    print("환경 변수에 RUNPOD_API_KEY와 RUNPOD_ENDPOINT_ID를 설정해주세요.")
    exit(1)

RUNPOD_API_URL = f"https://api.runpod.ai/v2/{RUNPOD_ENDPOINT_ID}/run"
RUNPOD_STATUS_URL = f"https://api.runpod.ai/v2/{RUNPOD_ENDPOINT_ID}/status"


def safe_base64_decode(data):
    """
    안전한 base64 디코딩 함수
    """
    try:
        # base64 문자열에서 data URL prefix 제거 (있는 경우)
        if data.startswith('data:'):
            data = data.split(',', 1)[1]

        # base64 패딩 추가 (필요한 경우)
        missing_padding = len(data) % 4
        if missing_padding:
            data += '=' * (4 - missing_padding)

        return base64.b64decode(data)
    except Exception as e:
        print(f"Base64 디코딩 오류: {e}")
        return None


try:
    # 결과 저장 디렉토리 확인/생성
    os.makedirs("results", exist_ok=True)

    print("워크플로우와 이미지 파일 로드 중...")

    with open('input.json', 'r', encoding='utf-8') as file:
        workflow_data = json.load(file)

    # color.png와 texture.png 파일을 각각 Base64로 인코딩
    print("이미지 파일을 Base64로 인코딩 중...")

    with open('input-1.png', 'rb') as input_1_file:
        input_1_data = input_1_file.read()
        input_1_encoded = base64.b64encode(input_1_data).decode('utf-8')
    with open('input-2.png', 'rb') as input_2_file:
        input_2_data = input_2_file.read()
        input_2_encoded = base64.b64encode(input_2_data).decode('utf-8')

    with open('mask.png', 'rb') as mask_file:
        mask_data = mask_file.read()
        mask_encoded = base64.b64encode(mask_data).decode('utf-8')

    # 요청 데이터 구성
    request_data = {
        "input": {
            "workflow": workflow_data,  # json 텍스트를 그대로 넣으면 됨.
            "images": [
                {
                    "name": "input-1.png",  # 인페인트될 옷 혹은 텍스처
                    "image": input_1_encoded
                },
                {
                    "name": "input-2.png",  # 인페인트 당할 레퍼런스
                    "image": input_2_encoded
                },
                {
                    "name": "mask.png",  # 인페인트 당할 레퍼런스 중 인페인트될 부분
                    # mask 이미지를 base64로 인코딩해서 넣어야 함 (예시로 빈 문자열)
                    "image": mask_encoded
                },
            ]
        }
    }

    # API 요청 헤더
    headers = {
        "Authorization": f"Bearer {RUNPOD_API_KEY}",
        "Content-Type": "application/json"
    }

    print("RunPod API에 요청 전송 중...")
    response = requests.post(
        RUNPOD_API_URL, json=request_data, headers=headers)

    if response.status_code == 200:
        run_data = response.json()
        print(f"API 응답: {run_data}")
        job_id = run_data.get("id")

        if not job_id:
            print("작업 ID를 받지 못했습니다.")
            print(f"전체 응답: {run_data}")
            exit(1)

        print(f"작업이 시작되었습니다. 작업 ID: {job_id}")

        # 작업 상태 확인
        status_url = f"{RUNPOD_STATUS_URL}/{job_id}"

        print("작업 완료를 기다리는 중...")
        max_wait_time = 300  # 최대 5분 대기
        wait_time = 0

        while wait_time < max_wait_time:
            status_response = requests.get(status_url, headers=headers)

            if status_response.status_code == 200:
                status_data = status_response.json()
                status = status_data.get("status")

                print(f"작업 상태: {status} (대기 시간: {wait_time}초)")

                if status == "COMPLETED":
                    print(
                        f"작업 완료! 실행 시간: {status_data.get('executionTime')}ms")

                    # output 데이터 추출
                    output = status_data.get("output", {})
                    print(f"Output 데이터 타입: {type(output)}")
                    print(
                        f"Output 키들: {list(output.keys()) if isinstance(output, dict) else 'dict가 아님'}")

                    if output and isinstance(output, dict):
                        print("결과 이미지 저장 중...")

                        # rp_handler.py의 process_output_images 함수 반환 형식에 맞춰 처리
                        if "images" in output:
                            images_list = output["images"]
                            print(f"찾은 이미지 개수: {len(images_list)}")

                            for i, image_item in enumerate(images_list):
                                if isinstance(image_item, dict):
                                    image_data_b64 = image_item.get("data", "")
                                    original_path = image_item.get(
                                        "path", f"output_{i}.png")

                                    print(f"이미지 {i+1} 처리 중: {original_path}")
                                    print(
                                        f"Base64 데이터 길이: {len(image_data_b64) if image_data_b64 else 0}")

                                    if image_data_b64:
                                        # base64 디코딩
                                        image_data = safe_base64_decode(
                                            image_data_b64)

                                        if image_data:
                                            # 파일명 생성
                                            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

                                            # 원본 경로에서 파일명만 추출
                                            filename_only = os.path.basename(
                                                original_path)
                                            name_part, ext_part = os.path.splitext(
                                                filename_only)
                                            if not ext_part:
                                                ext_part = '.png'

                                            output_filename = f"results/{timestamp}_{name_part}_{i+1}{ext_part}"

                                            # 이미지 파일 저장
                                            with open(output_filename, 'wb') as f:
                                                f.write(image_data)
                                            print(
                                                f"✓ 이미지 저장됨: {output_filename}")
                                        else:
                                            print(f"✗ 이미지 {i+1} 디코딩 실패")
                                    else:
                                        print(f"✗ 이미지 {i+1}에 data가 없습니다.")

                        # 다른 형태의 output 처리 (하위 호환성)
                        else:
                            print("images 키를 찾을 수 없습니다. 다른 형태로 처리 시도...")

                            # 직접 base64 문자열들 찾기
                            saved_count = 0
                            for key, value in output.items():
                                # base64일 가능성이 있는 긴 문자열
                                if isinstance(value, str) and len(value) > 100:
                                    print(f"키 '{key}'에서 이미지 데이터 시도 중...")

                                    image_data = safe_base64_decode(value)
                                    # 최소 이미지 크기 확인
                                    if image_data and len(image_data) > 1000:
                                        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                                        output_filename = f"results/{timestamp}_{key}.png"

                                        with open(output_filename, 'wb') as f:
                                            f.write(image_data)
                                        print(f"✓ 이미지 저장됨: {output_filename}")
                                        saved_count += 1

                            if saved_count == 0:
                                print("저장할 수 있는 이미지를 찾지 못했습니다.")
                                print("Output 내용:")
                                for key, value in output.items():
                                    if isinstance(value, str):
                                        print(f"  {key}: {value[:100]}..." if len(
                                            value) > 100 else f"  {key}: {value}")
                                    else:
                                        print(
                                            f"  {key}: {type(value)} - {value}")

                        print("이미지 처리 완료!")

                    else:
                        print("유효한 output 데이터가 없습니다.")
                        print(f"Status data: {status_data}")

                    break

                elif status == "FAILED":
                    error_msg = status_data.get('error', '알 수 없는 오류')
                    print(f"작업 실패: {error_msg}")
                    print(f"전체 상태 데이터: {status_data}")
                    break

                elif status in ["IN_QUEUE", "IN_PROGRESS"]:
                    print(f"작업 진행 중... ({status})")
                    time.sleep(5)
                    wait_time += 5

                else:
                    print(f"알 수 없는 상태: {status}")
                    time.sleep(5)
                    wait_time += 5

            else:
                print(f"상태 확인 오류: {status_response.status_code}")
                print(f"응답: {status_response.text}")
                time.sleep(10)
                wait_time += 10

        else:
            print(f"최대 대기 시간({max_wait_time}초)을 초과했습니다.")

    else:
        print(f"RunPod API 요청 실패: {response.status_code}")
        print(f"응답 내용: {response.text}")

except FileNotFoundError as e:
    print(f"파일을 찾을 수 없습니다: {e}")
except json.JSONDecodeError as e:
    print(f"JSON 파싱 오류: {e}")
except Exception as e:
    print(f"예상치 못한 오류 발생: {str(e)}")
    import traceback
    traceback.print_exc()


##input json
{
  "10": {
    "inputs": {
      "vae_name": "ae.safetensors"
    },
    "class_type": "VAELoader",
    "_meta": {
      "title": "VAE 로드"
    }
  },
  "11": {
    "inputs": {
      "clip_name1": "clip_l.safetensors",
      "clip_name2": "t5xxl_fp16.safetensors",
      "type": "flux",
      "device": "default"
    },
    "class_type": "DualCLIPLoader",
    "_meta": {
      "title": "이중 CLIP 로드"
    }
  },
  "173": {
    "inputs": {
      "style_model_name": "flux-redux.safetensors"
    },
    "class_type": "StyleModelLoader",
    "_meta": {
      "title": "스타일 모델 로드"
    }
  },
  "422": {
    "inputs": {
      "image": "input-1.png",
      "upload": "image"
    },
    "class_type": "LoadImage",
    "_meta": {
      "title": "이미지 로드"
    }
  },
  "590": {
    "inputs": {
      "image": "input-2.png",
      "upload": "image"
    },
    "class_type": "LoadImage",
    "_meta": {
      "title": "이미지 로드"
    }
  },
  "645": {
    "inputs": {
      "width": 1024,
      "height": 0,
      "interpolation": "lanczos",
      "method": "keep proportion",
      "condition": "always",
      "multiple_of": 0,
      "image": ["590", 0]
    },
    "class_type": "ImageResize+",
    "_meta": {
      "title": "🔧 Image Resize"
    }
  },
  "646": {
    "inputs": {
      "width": ["645", 1],
      "height": ["645", 2],
      "interpolation": "lanczos",
      "method": "fill / crop",
      "condition": "always",
      "multiple_of": 0,
      "image": ["422", 0]
    },
    "class_type": "ImageResize+",
    "_meta": {
      "title": "🔧 Image Resize"
    }
  },
  "649": {
    "inputs": {
      "direction": "right",
      "match_image_size": true,
      "image1": ["646", 0],
      "image2": ["645", 0]
    },
    "class_type": "ImageConcanate",
    "_meta": {
      "title": "Image Concatenate"
    }
  },
  "651": {
    "inputs": {
      "width": ["645", 1],
      "height": ["645", 2],
      "red": 0,
      "green": 0,
      "blue": 0
    },
    "class_type": "Image Blank",
    "_meta": {
      "title": "Image Blank"
    }
  },
  "652": {
    "inputs": {
      "direction": "right",
      "match_image_size": true,
      "image1": ["651", 0],
      "image2": ["653", 0]
    },
    "class_type": "ImageConcanate",
    "_meta": {
      "title": "Image Concatenate"
    }
  },
  "653": {
    "inputs": {
      "mask": ["698", 0]
    },
    "class_type": "MaskToImage",
    "_meta": {
      "title": "마스크를 이미지로 변환"
    }
  },
  "655": {
    "inputs": {
      "channel": "red",
      "image": ["652", 0]
    },
    "class_type": "ImageToMask",
    "_meta": {
      "title": "이미지를 마스크로 변환"
    }
  },
  "658": {
    "inputs": {
      "text": "",
      "clip": ["11", 0]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "CLIP 텍스트 인코딩 (프롬프트)"
    }
  },
  "659": {
    "inputs": {
      "conditioning": ["658", 0]
    },
    "class_type": "ConditioningZeroOut",
    "_meta": {
      "title": "조건 (0으로 출력)"
    }
  },
  "660": {
    "inputs": {
      "noise_mask": true,
      "positive": ["658", 0],
      "negative": ["659", 0],
      "vae": ["10", 0],
      "pixels": ["649", 0],
      "mask": ["679", 0]
    },
    "class_type": "InpaintModelConditioning",
    "_meta": {
      "title": "인페인팅 모델 조건 설정"
    }
  },
  "661": {
    "inputs": {
      "guidance": 30,
      "conditioning": ["667", 0]
    },
    "class_type": "FluxGuidance",
    "_meta": {
      "title": "FLUX 가이드"
    }
  },
  "662": {
    "inputs": {
      "crop": "center",
      "clip_vision": ["663", 0],
      "image": ["422", 0]
    },
    "class_type": "CLIPVisionEncode",
    "_meta": {
      "title": "CLIP_VISION 인코딩"
    }
  },
  "663": {
    "inputs": {
      "clip_name": "sigclip_vision_patch14_384.safetensors"
    },
    "class_type": "CLIPVisionLoader",
    "_meta": {
      "title": "CLIP_VISION 로드"
    }
  },
  "665": {
    "inputs": {
      "samples": ["689", 0],
      "vae": ["10", 0]
    },
    "class_type": "VAEDecode",
    "_meta": {
      "title": "VAE 디코드"
    }
  },
  "667": {
    "inputs": {
      "strength": 1,
      "strength_type": "multiply",
      "conditioning": ["660", 0],
      "style_model": ["173", 0],
      "clip_vision_output": ["662", 0]
    },
    "class_type": "StyleModelApply",
    "_meta": {
      "title": "스타일 모델 적용"
    }
  },
  "669": {
    "inputs": {
      "images": ["680", 0]
    },
    "class_type": "PreviewImage",
    "_meta": {
      "title": "이미지 미리보기"
    }
  },
  "679": {
    "inputs": {
      "expand": 5,
      "incremental_expandrate": 0,
      "tapered_corners": true,
      "flip_input": false,
      "blur_radius": 3,
      "lerp_alpha": 1,
      "decay_factor": 1,
      "fill_holes": false,
      "mask": ["655", 0]
    },
    "class_type": "GrowMaskWithBlur",
    "_meta": {
      "title": "Grow Mask With Blur"
    }
  },
  "680": {
    "inputs": {
      "width": ["645", 1],
      "height": ["645", 2],
      "position": "top-right",
      "x_offset": 0,
      "y_offset": 0,
      "image": ["665", 0]
    },
    "class_type": "ImageCrop+",
    "_meta": {
      "title": "🔧 Image Crop"
    }
  },
  "687": {
    "inputs": {
      "unet_name": "flux_fill_Q8.gguf"
    },
    "class_type": "UnetLoaderGGUF",
    "_meta": {
      "title": "Unet Loader (GGUF)"
    }
  },
  "688": {
    "inputs": {
      "model": ["687", 0]
    },
    "class_type": "DifferentialDiffusion",
    "_meta": {
      "title": "차등 확산"
    }
  },
  "689": {
    "inputs": {
      "seed": {⚠
Error: Parse error on line 284:
...": {      "seed": {seed},      "steps"
----------------------^
Expecting 'STRING', '}', got 'undefined'
seed},
      "steps": 28,
      "cfg": 1,
      "sampler_name": "euler",
      "scheduler": "beta",
      "denoise": 1,
      "model": ["688", 0],
      "positive": ["661", 0],
      "negative": ["660", 1],
      "latent_image": ["660", 2]
    },
    "class_type": "KSampler",
    "_meta": {
      "title": "KSampler"
    }
  },
  "698": {
    "inputs": {
      "image": "mask.png",
      "channel": "alpha",
      "upload": "image"
    },
    "class_type": "LoadImageMask",
    "_meta": {
      "title": "마스크 이미지 로드"
    }
  },
  "699": {
    "inputs": {
      "filename_prefix": "const",
      "images": ["680", 0]
    },
    "class_type": "SaveImage",
    "_meta": {
      "title": "이미지 저장"
    }
  }
}