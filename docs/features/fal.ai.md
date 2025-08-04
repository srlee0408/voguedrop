Queue API | fal.ai Reference
For requests that take longer than several seconds, as it is usually the case with AI models, we provide a queue system.

It offers granular control in dealing with surges in traffic, allows you to cancel requests and monitor the current position within the queue, and removes the need to keep long running connections open.

Queue endpoints
The queue functionality is exposed via standardized per-model paths under https://queue.fal.run.

Endpoint	Method	Description
https://queue.fal.run/{model_id}	POST	Adds a request to the queue for a top-level path
https://queue.fal.run/{model_id}/{subpath}	POST	Adds a request to the queue for an optional subpath
https://queue.fal.run/{model_id}/requests/{request_id}/status	GET	Gets the status of a request
https://queue.fal.run/{model_id}/requests/{request_id}/status/stream	GET	Streams the status of a request until it’s completed
https://queue.fal.run/{model_id}/requests/{request_id}	GET	Gets the response of a request
https://queue.fal.run/{model_id}/requests/{request_id}/cancel	PUT	Cancels a request that has not started processing
Parameters:

model_id: the model ID consists of a namespace and model name separated by a slash, e.g. fal-ai/fast-sdxl. Many models expose only a single top-level endpoint, so you can directly call them by model_id.
subpath: some models expose different capabilities at different sub-paths, e.g. fal-ai/flux/dev. The subpath (/dev in this case) should be used when making the request, but not when getting request status or results
request_id is returned after adding a request to the queue. This is the identifier you use to check the status and get results and logs
Submit a request
Here is an example of using curl to submit a request which will add it to the queue:

Terminal window
curl -X POST https://queue.fal.run/fal-ai/fast-sdxl \
  -H "Authorization: Key $FAL_KEY" \
  -d '{"prompt": "a cat"}'

Here’s an example of a response with the request_id:

{
  "request_id": "80e732af-660e-45cd-bd63-580e4f2a94cc",
  "response_url": "https://queue.fal.run/fal-ai/fast-sdxl/requests/80e732af-660e-45cd-bd63-580e4f2a94cc",
  "status_url": "https://queue.fal.run/fal-ai/fast-sdxl/requests/80e732af-660e-45cd-bd63-580e4f2a94cc/status",
  "cancel_url": "https://queue.fal.run/fal-ai/fast-sdxl/requests/80e732af-660e-45cd-bd63-580e4f2a94cc/cancel"
}

The payload helps you to keep track of your request with the request_id, and provides you with the necessary information to get the status of your request, cancel it or get the response once it’s ready, so you don’t have to build these endpoints yourself.

Request status
Once you have the request id you may use this request id to get the status of the request. This endpoint will give you information about your request’s status, it’s position in the queue or the response itself if the response is ready.

Terminal window
curl -X GET https://queue.fal.run/fal-ai/fast-sdxl/requests/{request_id}/status

Here’s an example of a response with the IN_QUEUE status:

{
  "status": "IN_QUEUE",
  "queue_position": 0,
  "response_url": "https://queue.fal.run/fal-ai/fast-sdxl/requests/80e732af-660e-45cd-bd63-580e4f2a94cc"
}

Status types
Queue status can have one of the following types and their respective properties:

IN_QUEUE:

queue_position: The current position of the task in the queue.
response_url: The URL where the response will be available once the task is processed.
IN_PROGRESS:

logs: An array of logs related to the request. Note that it needs to be enabled, as explained in the next section.
response_url: The URL where the response will be available.
COMPLETED:

logs: An array of logs related to the request. Note that it needs to be enabled, as explained in the next section.
response_url: The URL where the response is available.
Logs
Logs are disabled by default. In order to enable logs for your request, you need to send the logs=1 query parameter when getting the status of your request. For example:

Terminal window
curl -X GET https://queue.fal.run/fal-ai/fast-sdxl/requests/{request_id}/status?logs=1

When enabled, the logs attribute in the queue status contains an array of log entries, each represented by the RequestLog type. A RequestLog object has the following attributes:

message: a string containing the log message.
level: the severity of the log, it can be one of the following:
STDERR | STDOUT | ERROR | INFO | WARN | DEBUG
source: indicates the source of the log.
timestamp: a string representing the time when the log was generated.
These logs offer valuable insights into the status and progress of your queued tasks, facilitating effective monitoring and debugging.

Streaming status
If you want to keep track of the status of your request in real-time, you can use the streaming endpoint. The response is text/event-stream and each event is a JSON object with the status of the request exactly as the non-stream endpoint.

This endpoint will keep the connection open until the status of the request changes to COMPLETED.

It supports the same logs query parameter as the status.

Terminal window
curl -X GET https://queue.fal.run/fal-ai/fast-sdxl/requests/{request_id}/status/stream

Here is an example of a stream of status updates:

Terminal window
$ curl https://queue.fal.run/fashn/tryon/requests/3e3e5b55-45fb-4e5c-b4d1-05702dffc8bf/status/stream?logs=1 --header "Authorization: Key $FAL_KEY"

data: {"status": "IN_PROGRESS", "request_id": "3e3e5b55-45fb-4e5c-b4d1-05702dffc8bf", "response_url": "https://queue.fal.run/fashn/tryon/requests/3e3e5b55-45fb-4e5c-b4d1-05702dffc8bf", "status_url": "https://queue.fal.run/fashn/tryon/requests/3e3e5b55-45fb-4e5c-b4d1-05702dffc8bf/status", "cancel_url": "https://queue.fal.run/fashn/tryon/requests/3e3e5b55-45fb-4e5c-b4d1-05702dffc8bf/cancel", "logs": [], "metrics": {}}

data: {"status": "IN_PROGRESS", "request_id": "3e3e5b55-45fb-4e5c-b4d1-05702dffc8bf", "response_url": "https://queue.fal.run/fashn/tryon/requests/3e3e5b55-45fb-4e5c-b4d1-05702dffc8bf", "status_url": "https://queue.fal.run/fashn/tryon/requests/3e3e5b55-45fb-4e5c-b4d1-05702dffc8bf/status", "cancel_url": "https://queue.fal.run/fashn/tryon/requests/3e3e5b55-45fb-4e5c-b4d1-05702dffc8bf/cancel", "logs": [{"timestamp": "2024-12-20T15:37:17.120314", "message": "INFO:TRYON:Preprocessing images...", "labels": {}}, {"timestamp": "2024-12-20T15:37:17.286519", "message": "INFO:TRYON:Running try-on model...", "labels": {}}], "metrics": {}}

data: {"status": "IN_PROGRESS", "request_id": "3e3e5b55-45fb-4e5c-b4d1-05702dffc8bf", "response_url": "https://queue.fal.run/fashn/tryon/requests/3e3e5b55-45fb-4e5c-b4d1-05702dffc8bf", "status_url": "https://queue.fal.run/fashn/tryon/requests/3e3e5b55-45fb-4e5c-b4d1-05702dffc8bf/status", "cancel_url": "https://queue.fal.run/fashn/tryon/requests/3e3e5b55-45fb-4e5c-b4d1-05702dffc8bf/cancel", "logs": [], "metrics": {}}

: ping

data: {"status": "IN_PROGRESS", "request_id": "3e3e5b55-45fb-4e5c-b4d1-05702dffc8bf", "response_url": "https://queue.fal.run/fashn/tryon/requests/3e3e5b55-45fb-4e5c-b4d1-05702dffc8bf", "status_url": "https://queue.fal.run/fashn/tryon/requests/3e3e5b55-45fb-4e5c-b4d1-05702dffc8bf/status", "cancel_url": "https://queue.fal.run/fashn/tryon/requests/3e3e5b55-45fb-4e5c-b4d1-05702dffc8bf/cancel", "logs": [], "metrics": {}}

data: {"status": "COMPLETED", "request_id": "3e3e5b55-45fb-4e5c-b4d1-05702dffc8bf", "response_url": "https://queue.fal.run/fashn/tryon/requests/3e3e5b55-45fb-4e5c-b4d1-05702dffc8bf", "status_url": "https://queue.fal.run/fashn/tryon/requests/3e3e5b55-45fb-4e5c-b4d1-05702dffc8bf/status", "cancel_url": "https://queue.fal.run/fashn/tryon/requests/3e3e5b55-45fb-4e5c-b4d1-05702dffc8bf/cancel", "logs": [{"timestamp": "2024-12-20T15:37:32.161184", "message": "INFO:TRYON:Finished running try-on model.", "labels": {}}], "metrics": {"inference_time": 17.795265674591064}}

Cancelling a request
If your request has not started processing (status is IN_QUEUE), you may attempt to cancel it.

Terminal window
curl -X PUT https://queue.fal.run/fal-ai/fast-sdxl/requests/{request_id}/cancel

If the request has not already started processing, you will get a 202 Accepted response with the following body:

{
  "status": "CANCELLATION_REQUESTED"
}

Note that a request may still be executed after getting this response if it was very late in the queue process.

If the request is already processed, you will get a 400 Bad Request response with this body:

{
  "status": "ALREADY_COMPLETED"
}

Getting the response
Once you get the COMPLETED status, the response will be available along with its logs.

Terminal window
curl -X GET https://queue.fal.run/fal-ai/fast-sdxl/requests/{request_id}

Here’s an example of a response with the COMPLETED status:

{
  "status": "COMPLETED",
  "logs": [
    {
      "message": "2020-05-04 14:00:00.000000",
      "level": "INFO",
      "source": "stdout",
      "timestamp": "2020-05-04T14:00:00.000000Z"
    }
  ],
  "response": {
    "message": "Hello World!"
  }
}

Webhooks API | fal.ai Reference
Webhooks work in tandem with the queue system explained above, it is another way to interact with our queue. By providing us a webhook endpoint you get notified when the request is done as opposed to polling it.

Here is how this works in practice, it is very similar to submitting something to the queue but we require you to pass an extra fal_webhook query parameter.

To utilize webhooks, your requests should be directed to the queue.fal.run endpoint, instead of the standard fal.run. This distinction is crucial for enabling webhook functionality, as it ensures your request is handled by the queue system designed to support asynchronous operations and notifications.

Terminal window
curl --request POST \
  --url 'https://queue.fal.run/fal-ai/flux/dev?fal_webhook=https://url.to.your.app/api/fal/webhook' \
  --header "Authorization: Key $FAL_KEY" \
  --header 'Content-Type: application/json' \
  --data '{
  "prompt": "Photo of a cute dog"
}'

The request will be queued and you will get a response with the request_id and gateway_request_id:

{
  "request_id": "024ca5b1-45d3-4afd-883e-ad3abe2a1c4d",
  "gateway_request_id": "024ca5b1-45d3-4afd-883e-ad3abe2a1c4d"
}

These two will be mostly the same, but if the request failed and was retried, gateway_request_id will have the value of the last tried request, while request_id will be the value used in the queue API.

Once the request is done processing in the queue, a POST request is made to the webhook URL, passing the request info and the resulting payload. The status indicates whether the request was successful or not.

When to use it?

Webhooks are particularly useful for requests that can take a while to process and/or the result is not needed immediately. For example, if you are training a model, which is a process than can take several minutes or even hours, webhooks could be the perfect tool for the job.

Successful result
The following is an example of a successful request:

{
  "request_id": "123e4567-e89b-12d3-a456-426614174000",
  "gateway_request_id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "OK",
  "payload": {
    "images": [
      {
        "url": "https://url.to/image.png",
        "content_type": "image/png",
        "file_name": "image.png",
        "file_size": 1824075,
        "width": 1024,
        "height": 1024
      }
    ],
    "seed": 196619188014358660
  }
}

Response errors
When an error happens, the status will be ERROR. The error property will contain a message and the payload will provide the error details. For example, if you forget to pass the required model_name parameter, you will get the following response:

{
  "request_id": "123e4567-e89b-12d3-a456-426614174000",
  "gateway_request_id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "ERROR",
  "error": "Invalid status code: 422",
  "payload": {
    "detail": [
      {
        "loc": ["body", "prompt"],
        "msg": "field required",
        "type": "value_error.missing"
      }
    ]
  }
}

Payload errors
For the webhook to include the payload, it must be valid JSON. So if there is an error serializing it, payload is set to null and a payload_error will include details about the error.

{
  "request_id": "123e4567-e89b-12d3-a456-426614174000",
  "gateway_request_id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "OK",
  "payload": null,
  "payload_error": "Response payload is not JSON serializable. Either return a JSON serializable object or use the queue endpoint to retrieve the response."
}

Retry policy
If the webhook fails to deliver the payload, it will retry 10 times in the span of 2 hours.

Verifying Your Webhook
To ensure the security and integrity of incoming webhook requests, you must verify that they originate from the expected source. This involves validating a cryptographic signature included in the request using a set of public keys. Below is a step-by-step guide to the verification process, followed by example implementations in Python and JavaScript.

Verification Process
Fetch the JSON Web Key Set (JWKS):

Retrieve the public keys from the JWKS endpoint: https://rest.alpha.fal.ai/.well-known/jwks.json.
The JWKS contains a list of public keys in JSON format, each with an x field holding a base64url-encoded ED25519 public key.
Note: The JWKS is cacheable to reduce network requests. Ensure your implementation caches the keys and refreshes them after the cache duration expires. Do not cache longer than 24 hours since they can change.
Extract Required Headers:

Obtain the following headers from the incoming webhook request:
X-Fal-Webhook-Request-Id: The unique request ID.
X-Fal-Webhook-User-Id: Your user ID.
X-Fal-Webhook-Timestamp: The timestamp when the request was generated (in Unix epoch seconds).
X-Fal-Webhook-Signature: The cryptographic signature in hexadecimal format.
If any header is missing, the request is invalid.
Verify the Timestamp:

Compare the X-Fal-Webhook-Timestamp with the current Unix timestamp.
Allow a leeway of ±5 minutes (300 seconds) to account for clock skew and network delays.
If the timestamp differs by more than 300 seconds, reject the request to prevent replay attacks.
Construct the Message:

Compute the SHA-256 hash of the request body (raw bytes, not JSON-parsed).
Concatenate the following in strict order, separated by newline characters (\n):
X-Fal-Webhook-Request-Id
X-Fal-Webhook-User-Id
X-Fal-Webhook-Timestamp
Hex-encoded SHA-256 hash of the request body
Encode the resulting string as UTF-8 bytes to form the message to verify.
Verify the Signature:

Decode the X-Fal-Webhook-Signature from hexadecimal to bytes.
For each public key in the JWKS:
Decode the x field from base64url to bytes.
Use an ED25519 verification function (e.g., from PyNaCl in Python or libsodium in JavaScript) to verify the signature against the constructed message.
If any key successfully verifies the signature, the request is valid.
If no key verifies the signature, the request is invalid.
Example Implementations
Below are simplified functions to verify webhook signatures by passing the header values and request body directly. These examples handle the verification process as described above and include JWKS caching.

python
javascript
Install dependencies:

Terminal window
pip install pynacl requests

Verification function:

import base64
import hashlib
import time
from typing import Optional
import requests
from nacl.signing import VerifyKey
from nacl.exceptions import BadSignatureError
from nacl.encoding import HexEncoder

JWKS_URL = "https://rest.alpha.fal.ai/.well-known/jwks.json"
JWKS_CACHE_DURATION = 24 * 60 * 60  # 24 hours in seconds
_jwks_cache = None
_jwks_cache_time = 0

def fetch_jwks() -> list:
    """Fetch and cache JWKS, refreshing after 24 hours."""
    global _jwks_cache, _jwks_cache_time
    current_time = time.time()
    if _jwks_cache is None or (current_time - _jwks_cache_time) > JWKS_CACHE_DURATION:
        response = requests.get(JWKS_URL, timeout=10)
        response.raise_for_status()
        _jwks_cache = response.json().get("keys", [])
        _jwks_cache_time = current_time
    return _jwks_cache

def verify_webhook_signature(
    request_id: str,
    user_id: str,
    timestamp: str,
    signature_hex: str,
    body: bytes
) -> bool:
    """
    Verify a webhook signature using provided headers and body.

    Args:
        request_id: Value of X-Fal-Webhook-Request-Id header.
        user_id: Value of X-Fal-Webhook-User-Id header.
        timestamp: Value of X-Fal-Webhook-Timestamp header.
        signature_hex: Value of X-Fal-Webhook-Signature header (hex-encoded).
        body: Raw request body as bytes.

    Returns:
        bool: True if the signature is valid, False otherwise.
    """
    # Validate timestamp (within ±5 minutes)
    try:
        timestamp_int = int(timestamp)
        current_time = int(time.time())
        if abs(current_time - timestamp_int) > 300:
            print("Timestamp is too old or in the future.")
            return False
    except ValueError:
        print("Invalid timestamp format.")
        return False

    # Construct the message to verify
    try:
        message_parts = [
            request_id,
            user_id,
            timestamp,
            hashlib.sha256(body).hexdigest()
        ]
        if any(part is None for part in message_parts):
            print("Missing required header value.")
            return False
        message_to_verify = "\n".join(message_parts).encode("utf-8")
    except Exception as e:
        print(f"Error constructing message: {e}")
        return False

    # Decode signature
    try:
        signature_bytes = bytes.fromhex(signature_hex)
    except ValueError:
        print("Invalid signature format (not hexadecimal).")
        return False

    # Fetch public keys
    try:
        public_keys_info = fetch_jwks()
        if not public_keys_info:
            print("No public keys found in JWKS.")
            return False
    except Exception as e:
        print(f"Error fetching JWKS: {e}")
        return False

    # Verify signature with each public key
    for key_info in public_keys_info:
        try:
            public_key_b64url = key_info.get("x")
            if not isinstance(public_key_b64url, str):
                continue
            public_key_bytes = base64.urlsafe_b64decode(public_key_b64url)
            verify_key = VerifyKey(public_key_bytes.hex(), encoder=HexEncoder)
            verify_key.verify(message_to_verify, signature_bytes)
            return True
        except (BadSignatureError, Exception) as e:
            print(f"Verification failed with a key: {e}")
            continue

    print("Signature verification failed with all keys.")
    return False

Usage Notes
Caching the JWKS: The JWKS can be cached for 24 hours to minimize network requests. The example implementations include basic in-memory caching.
Timestamp Validation: The ±5-minute leeway ensures robustness against minor clock differences. Adjust this value if your use case requires stricter or looser validation.
Error Handling: The examples include comprehensive error handling for missing headers, invalid signatures, and network issues. Log errors appropriately for debugging.
Framework Integration: For frameworks like FastAPI (Python) or Express (JavaScript), ensure the raw request body is accessible. For Express, use express.raw({ type: 'application/json' }) middleware before JSON parsing.