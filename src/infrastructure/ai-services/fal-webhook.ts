/**
 * fal.ai Webhook 검증 모듈
 * webhook 서명을 검증하여 요청이 fal.ai에서 온 것인지 확인
 */
import crypto from 'crypto';

const JWKS_URL = "https://rest.alpha.fal.ai/.well-known/jwks.json";
const JWKS_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24시간 (밀리초)

interface JWK {
  x: string;
  [key: string]: unknown;
}

let jwksCache: JWK[] | null = null;
let jwksCacheTime = 0;

/**
 * JWKS를 가져오고 캐싱합니다.
 */
async function fetchJWKS(): Promise<JWK[]> {
  const currentTime = Date.now();
  
  if (!jwksCache || (currentTime - jwksCacheTime) > JWKS_CACHE_DURATION) {
    try {
      const response = await fetch(JWKS_URL, {
        signal: AbortSignal.timeout(10000) // 10초 타임아웃
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch JWKS: ${response.status}`);
      }
      
      const data = await response.json();
      jwksCache = data.keys || [];
      jwksCacheTime = currentTime;
    } catch (error) {
      console.error('Error fetching JWKS:', error);
      // 캐시가 있으면 기존 캐시 사용
      if (jwksCache) {
        return jwksCache;
      }
      throw error;
    }
  }
  
  return jwksCache || [];
}

/**
 * Webhook 서명을 검증합니다.
 */
export async function verifyWebhookSignature(
  requestId: string,
  userId: string,
  timestamp: string,
  signatureHex: string,
  body: Buffer
): Promise<boolean> {
  try {
    // 1. 타임스탬프 검증 (±5분)
    const timestampInt = parseInt(timestamp, 10);
    const currentTime = Math.floor(Date.now() / 1000);
    
    if (Math.abs(currentTime - timestampInt) > 300) {
      console.error('Webhook timestamp is too old or in the future');
      return false;
    }
    
    // 2. 검증할 메시지 구성
    const bodyHash = crypto.createHash('sha256').update(body).digest('hex');
    const messageParts = [
      requestId,
      userId,
      timestamp,
      bodyHash
    ];
    
    if (messageParts.some(part => !part)) {
      console.error('Missing required header value');
      return false;
    }
    
    const messageToVerify = Buffer.from(messageParts.join('\n'), 'utf-8');
    
    // 3. 서명 디코드
    const signatureBytes = Buffer.from(signatureHex, 'hex');
    
    // 4. 공개 키 가져오기
    const publicKeysInfo = await fetchJWKS();
    
    if (!publicKeysInfo || publicKeysInfo.length === 0) {
      console.error('No public keys found in JWKS');
      return false;
    }
    
    // 5. 각 공개 키로 서명 검증 시도
    // Note: Node.js는 기본적으로 Ed25519를 지원하지만, 
    // 추가 라이브러리가 필요할 수 있습니다.
    for (const keyInfo of publicKeysInfo) {
      try {
        const publicKeyB64Url = keyInfo.x;
        if (typeof publicKeyB64Url !== 'string') {
          continue;
        }
        
        // base64url을 base64로 변환
        const base64 = publicKeyB64Url
          .replace(/-/g, '+')
          .replace(/_/g, '/')
          .padEnd(publicKeyB64Url.length + (4 - publicKeyB64Url.length % 4) % 4, '=');
        
        const publicKeyBytes = Buffer.from(base64, 'base64');
        
        // Ed25519 공개 키 생성
        const publicKey = crypto.createPublicKey({
          key: Buffer.concat([
            Buffer.from('302a300506032b6570032100', 'hex'), // Ed25519 OID
            publicKeyBytes
          ]),
          format: 'der',
          type: 'spki'
        });
        
        // Ed25519 검증
        const isValid = crypto.verify(
          null,
          messageToVerify,
          publicKey,
          signatureBytes
        );
        
        if (isValid) {
          return true;
        }
      } catch {
        // 이 키로 검증 실패, 다음 키 시도
        continue;
      }
    }
    
    console.error('Signature verification failed with all keys');
    return false;
  } catch (error) {
    console.error('Error during webhook verification:', error);
    return false;
  }
}

/**
 * Webhook 헤더 추출 헬퍼
 */
export interface WebhookHeaders {
  requestId: string;
  userId: string;
  timestamp: string;
  signature: string;
}

export function extractWebhookHeaders(headers: Headers): WebhookHeaders | null {
  const requestId = headers.get('x-fal-webhook-request-id');
  const userId = headers.get('x-fal-webhook-user-id');
  const timestamp = headers.get('x-fal-webhook-timestamp');
  const signature = headers.get('x-fal-webhook-signature');
  
  if (!requestId || !userId || !timestamp || !signature) {
    return null;
  }
  
  return {
    requestId,
    userId,
    timestamp,
    signature
  };
}