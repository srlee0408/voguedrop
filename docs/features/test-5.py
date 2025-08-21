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
