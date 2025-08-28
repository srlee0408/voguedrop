import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/infrastructure/supabase/server';
import { createServiceClient } from '@/infrastructure/supabase/service';
import type { User } from '@supabase/supabase-js';

/**
 * API Route에서 사용자 인증을 확인하는 유틸리티 함수
 * RLS를 사용하지 않고 API 레벨에서 보안을 처리하기 위한 함수
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function requireAuth(request: NextRequest): Promise<{
  user: User | null;
  error: NextResponse | null;
}> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return {
      user: null,
      error: NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    };
  }
  
  return { user, error: null };
}

/**
 * 리소스 소유권을 검증하는 유틸리티 함수
 * Service Client를 사용하되, 명시적으로 user_id 조건을 추가하여 보안 강화
 */
export async function verifyResourceOwnership<T extends { user_id: string }>(
  tableName: string,
  resourceId: string | number,
  userId: string,
  additionalConditions?: Record<string, unknown>
): Promise<{
  data: T | null;
  error: string | null;
}> {
  const serviceSupabase = createServiceClient();
  
  let query = serviceSupabase
    .from(tableName)
    .select('*')
    .eq('id', resourceId)
    .eq('user_id', userId); // 명시적 소유권 검증
  
  // 추가 조건이 있으면 적용
  if (additionalConditions) {
    Object.entries(additionalConditions).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  }
  
  const { data, error } = await query.single();
  
  if (error || !data) {
    return {
      data: null,
      error: '리소스를 찾을 수 없거나 접근 권한이 없습니다.'
    };
  }
  
  return { data: data as T, error: null };
}

/**
 * 사용자별 데이터 조회를 위한 유틸리티 함수
 * Service Client를 사용하되, 항상 user_id 조건을 포함하여 다른 사용자 데이터 접근 차단
 */
export async function getUserScopedData<T>(
  tableName: string,
  userId: string,
  selectColumns: string = '*',
  additionalConditions?: Record<string, unknown>,
  options?: {
    limit?: number;
    orderBy?: { column: string; ascending?: boolean };
  }
): Promise<{
  data: T[] | null;
  error: string | null;
}> {
  const serviceSupabase = createServiceClient();
  
  let query = serviceSupabase
    .from(tableName)
    .select(selectColumns)
    .eq('user_id', userId); // 항상 user_id 조건 포함
  
  // 추가 조건 적용
  if (additionalConditions) {
    Object.entries(additionalConditions).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });
  }
  
  // 옵션 적용
  if (options?.orderBy) {
    query = query.order(options.orderBy.column, { 
      ascending: options.orderBy.ascending ?? false 
    });
  }
  
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error(`Error fetching user-scoped data from ${tableName}:`, error);
    return {
      data: null,
      error: '데이터를 불러오는데 실패했습니다.'
    };
  }
  
  return { data: data as T[], error: null };
}

/**
 * 사용자별 데이터 생성을 위한 유틸리티 함수
 * 항상 user_id를 포함하여 데이터 생성
 */
export async function createUserScopedData<T>(
  tableName: string,
  userId: string,
  data: Omit<T, 'user_id' | 'id' | 'created_at' | 'updated_at'>
): Promise<{
  data: T | null;
  error: string | null;
}> {
  const serviceSupabase = createServiceClient();
  
  const { data: created, error } = await serviceSupabase
    .from(tableName)
    .insert({
      ...data,
      user_id: userId // 항상 user_id 포함
    })
    .select()
    .single();
  
  if (error) {
    console.error(`Error creating data in ${tableName}:`, error);
    return {
      data: null,
      error: '데이터 생성에 실패했습니다.'
    };
  }
  
  return { data: created as T, error: null };
}

/**
 * 사용자별 데이터 업데이트를 위한 유틸리티 함수
 * 소유권을 검증한 후 업데이트 수행
 */
export async function updateUserScopedData<T>(
  tableName: string,
  resourceId: string | number,
  userId: string,
  updates: Partial<Omit<T, 'id' | 'user_id' | 'created_at'>>
): Promise<{
  data: T | null;
  error: string | null;
}> {
  const serviceSupabase = createServiceClient();
  
  // 먼저 소유권 확인
  const { data: existing, error: checkError } = await serviceSupabase
    .from(tableName)
    .select('id')
    .eq('id', resourceId)
    .eq('user_id', userId)
    .single();
  
  if (checkError || !existing) {
    return {
      data: null,
      error: '리소스를 찾을 수 없거나 수정 권한이 없습니다.'
    };
  }
  
  // 소유권이 확인되면 업데이트 수행
  const { data: updated, error: updateError } = await serviceSupabase
    .from(tableName)
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', resourceId)
    .eq('user_id', userId) // 추가 보안을 위해 user_id 조건도 포함
    .select()
    .single();
  
  if (updateError) {
    console.error(`Error updating data in ${tableName}:`, updateError);
    return {
      data: null,
      error: '데이터 업데이트에 실패했습니다.'
    };
  }
  
  return { data: updated as T, error: null };
}

/**
 * 사용자별 데이터 삭제를 위한 유틸리티 함수
 * 소유권을 검증한 후 삭제 수행
 */
export async function deleteUserScopedData(
  tableName: string,
  resourceId: string | number,
  userId: string
): Promise<{
  success: boolean;
  error: string | null;
}> {
  const serviceSupabase = createServiceClient();
  
  const { error } = await serviceSupabase
    .from(tableName)
    .delete()
    .eq('id', resourceId)
    .eq('user_id', userId); // 소유권 검증을 위한 조건
  
  if (error) {
    console.error(`Error deleting data from ${tableName}:`, error);
    return {
      success: false,
      error: '데이터 삭제에 실패했습니다.'
    };
  }
  
  return { success: true, error: null };
}

/**
 * API Response에서 민감한 정보를 제거하는 유틸리티 함수
 */
export function sanitizeResponse<T extends Record<string, unknown>>(
  data: T,
  fieldsToRemove: (keyof T)[] = []
): Partial<T> {
  const defaultFieldsToRemove = [
    'fal_request_id',
    'webhook_secret',
    'service_role_key',
    'api_key',
    'prompt' // AI 프롬프트도 민감한 정보로 간주
  ];
  
  const allFieldsToRemove = [
    ...defaultFieldsToRemove,
    ...fieldsToRemove
  ];
  
  const sanitized = { ...data };
  
  allFieldsToRemove.forEach(field => {
    delete sanitized[field as keyof T];
  });
  
  return sanitized;
}

/**
 * 일일 한도 체크 등 비즈니스 로직을 위한 헬퍼
 * Service Client를 사용하되 user_id로 범위 제한
 */
export async function checkUserQuota(
  userId: string,
  tableName: string,
  dateField: string = 'created_at',
  limit: number = 100
): Promise<{
  allowed: boolean;
  count: number;
}> {
  const serviceSupabase = createServiceClient();
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { data, error } = await serviceSupabase
    .from(tableName)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte(dateField, today.toISOString());
  
  if (error) {
    console.error('Error checking user quota:', error);
    return { allowed: false, count: 0 };
  }
  
  const count = data?.length || 0;
  return {
    allowed: count < limit,
    count
  };
}