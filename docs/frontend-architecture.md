# VogueDrop Frontend Architecture Document

## Template and Framework Selection

This document outlines the frontend architecture for VogueDrop MVP, based on the existing implementation using Next.js 14+ with App Router. The project is a greenfield implementation without using any starter template, following modern React patterns and best practices.

### Change Log
| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2025-01-30 | 1.0 | Initial frontend architecture based on existing implementation | BMad Master |

## Frontend Tech Stack

### Technology Stack Table
| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------|
| Framework | Next.js | 14.2+ | React framework with App Router | Server-side rendering, file-based routing, API routes |
| UI Library | React | 18.2+ | Component-based UI library | Industry standard, great ecosystem |
| State Management | React Hooks | Built-in | Local component state | Simple, sufficient for MVP needs |
| Routing | Next.js App Router | 14.2+ | File-based routing | Built into framework, type-safe |
| Build Tool | Next.js CLI | 14.2+ | Build and development | Zero configuration needed |
| Styling | Tailwind CSS | 3.4+ | Utility-first CSS | Rapid development, consistent design |
| Testing | Vitest | 1.2+ | Unit and component testing | Fast, Jest-compatible |
| Component Library | Custom | - | Project-specific components | Full control over design |
| Form Handling | Native React | - | Controlled components | Simple forms, no complex validation yet |
| Animation | CSS/Tailwind | - | Basic transitions | Sufficient for MVP animations |
| Dev Tools | TypeScript | 5.3+ | Type safety | Prevents runtime errors |

## Project Structure

```
voguedrop/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Authentication route group
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── signup/
│   │       └── page.tsx
│   ├── (home)/                   # Public route group
│   │   └── _components/
│   │       ├── GalleryItems.tsx
│   │       └── HeroSection.tsx
│   ├── canvas/                   # Canvas AI feature
│   │   ├── _components/          # Feature-specific components
│   │   │   ├── Canvas.tsx
│   │   │   ├── CanvasControls.tsx
│   │   │   ├── EffectsSection.tsx
│   │   │   ├── ImageSection.tsx
│   │   │   ├── LeftPanel.tsx
│   │   │   ├── PrompterSection.tsx
│   │   │   ├── QuickActionsBar.tsx
│   │   │   └── VideoLogPanel.tsx
│   │   ├── _hooks/              # Feature-specific hooks
│   │   │   └── useCanvas.ts
│   │   └── page.tsx
│   ├── video-editor/            # Video editor feature
│   │   ├── _components/
│   │   │   ├── ControlBar.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── SoundLibraryModal.tsx
│   │   │   ├── Timeline.tsx
│   │   │   ├── VideoLibraryModal.tsx
│   │   │   └── VideoPreview.tsx
│   │   └── page.tsx
│   ├── api/                     # API routes
│   │   ├── auth/
│   │   ├── canvas/
│   │   └── editor/
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Home page
├── components/                   # Shared components
│   ├── layout/
│   │   └── Header.tsx
│   ├── modals/                  # Shared modal components
│   │   ├── CameraModal.tsx
│   │   ├── EffectModal.tsx
│   │   ├── LibraryModal.tsx
│   │   ├── ModelModal.tsx
│   │   └── PromptModal.tsx
│   └── ui/                      # Base UI components
│       ├── Button.tsx
│       ├── Input.tsx
│       └── Modal.tsx
├── lib/                         # Utilities and configurations
│   ├── api/
│   │   ├── client.ts
│   │   └── gallery.ts
│   ├── supabase/
│   │   └── client.ts
│   └── utils/
│       └── cn.ts
├── hooks/                       # Global hooks
│   └── useAuth.ts
├── stores/                      # Global state stores (future)
├── types/                       # TypeScript definitions
│   ├── api.ts
│   └── database.ts
└── public/                      # Static assets
```

## Component Standards

### Component Template
```typescript
// Example: components/features/FeatureName/ComponentName.tsx
"use client"; // Only if client component

import { FC, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

interface ComponentNameProps {
  children?: ReactNode;
  className?: string;
  // Other props with TypeScript types
  title: string;
  onAction?: () => void;
  isActive?: boolean;
}

export const ComponentName: FC<ComponentNameProps> = ({ 
  children,
  className,
  title,
  onAction,
  isActive = false,
}) => {
  // Component logic here
  const handleClick = () => {
    onAction?.();
  };

  return (
    <div className={cn(
      "base-classes",
      isActive && "active-classes",
      className
    )}>
      <h2>{title}</h2>
      {children}
      <button onClick={handleClick}>Action</button>
    </div>
  );
};

// Default export for pages
export default ComponentName;
```

### Naming Conventions
- **Components**: PascalCase (e.g., `VideoPreview.tsx`, `EffectSelector.tsx`)
- **Files**: Same as component name for components, kebab-case for utilities
- **Hooks**: camelCase with 'use' prefix (e.g., `useCanvas.ts`, `useVideoEditor.ts`)
- **Types/Interfaces**: PascalCase with descriptive suffixes (e.g., `VideoGenerationProps`, `CanvasState`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_EFFECTS_COUNT`, `API_ENDPOINTS`)
- **Functions**: camelCase (e.g., `generateVideo`, `uploadImage`)
- **CSS Classes**: Tailwind utilities, custom classes use kebab-case
- **Route Groups**: Parentheses for grouping without affecting URL (e.g., `(auth)`, `(app)`)

## State Management

### Store Structure
```
stores/
├── canvas.store.ts       # Canvas feature state
├── editor.store.ts       # Video editor state
├── auth.store.ts         # Authentication state
└── ui.store.ts          # UI state (modals, themes)

hooks/
├── useCanvas.ts         # Canvas-specific hook
├── useVideoEditor.ts    # Editor-specific hook
└── useAuth.ts          # Auth hook
```

### State Management Template
```typescript
// Example: Local state with custom hook (current pattern)
// hooks/useCanvas.ts
import { useState, useCallback } from 'react';

export interface CanvasState {
  uploadedImage: string | null;
  selectedEffects: string[];
  isGenerating: boolean;
}

export function useCanvas() {
  const [state, setState] = useState<CanvasState>({
    uploadedImage: null,
    selectedEffects: [],
    isGenerating: false,
  });

  const uploadImage = useCallback((imageUrl: string) => {
    setState(prev => ({ ...prev, uploadedImage: imageUrl }));
  }, []);

  const toggleEffect = useCallback((effectId: string) => {
    setState(prev => ({
      ...prev,
      selectedEffects: prev.selectedEffects.includes(effectId)
        ? prev.selectedEffects.filter(id => id !== effectId)
        : [...prev.selectedEffects, effectId].slice(0, 4), // Max 4 effects
    }));
  }, []);

  const generateVideo = useCallback(async () => {
    setState(prev => ({ ...prev, isGenerating: true }));
    try {
      // API call here
      await canvasService.generateVideo(state);
    } finally {
      setState(prev => ({ ...prev, isGenerating: false }));
    }
  }, [state]);

  return {
    ...state,
    uploadImage,
    toggleEffect,
    generateVideo,
  };
}

// Future: Zustand store pattern
// stores/canvas.store.ts
import { create } from 'zustand';

interface CanvasStore extends CanvasState {
  uploadImage: (url: string) => void;
  toggleEffect: (effectId: string) => void;
  generateVideo: () => Promise<void>;
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  uploadedImage: null,
  selectedEffects: [],
  isGenerating: false,
  
  uploadImage: (url) => set({ uploadedImage: url }),
  
  toggleEffect: (effectId) => set((state) => ({
    selectedEffects: state.selectedEffects.includes(effectId)
      ? state.selectedEffects.filter(id => id !== effectId)
      : [...state.selectedEffects, effectId].slice(0, 4),
  })),
  
  generateVideo: async () => {
    set({ isGenerating: true });
    try {
      const state = get();
      await canvasService.generateVideo(state);
    } finally {
      set({ isGenerating: false });
    }
  },
}));
```

## API Integration

### Service Template
```typescript
// lib/api/services/canvas.service.ts
import { apiClient } from '@/lib/api/client';
import type { VideoGeneration, GenerateVideoParams } from '@/types/api';

export const canvasService = {
  /**
   * Upload image for video generation
   */
  async uploadImage(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('/api/canvas/upload', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Failed to upload image');
    }
    
    return response.json();
  },

  /**
   * Get available effects by category
   */
  async getEffects(category?: string): Promise<EffectTemplate[]> {
    return apiClient.get('/canvas/effects', { 
      params: { category } 
    });
  },

  /**
   * Generate AI video
   */
  async generateVideo(params: GenerateVideoParams): Promise<VideoGeneration> {
    return apiClient.post('/canvas/generate', params);
  },

  /**
   * Get user's generation history
   */
  async getHistory(page = 1, limit = 20): Promise<{
    data: VideoGeneration[];
    total: number;
    page: number;
  }> {
    return apiClient.get('/canvas/history', {
      params: { page, limit }
    });
  },
};
```

### API Client Configuration
```typescript
// lib/api/client.ts
import { createClient } from '@supabase/supabase-js';

class ApiClient {
  private baseUrl = '/api';
  
  private async request<T>(
    endpoint: string,
    options: RequestInit & { params?: Record<string, any> } = {}
  ): Promise<T> {
    const { params, ...init } = options;
    
    // Build URL with query params
    const url = new URL(`${this.baseUrl}${endpoint}`, window.location.origin);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    
    // Get auth token from Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch(url.toString(), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(session && { 'Authorization': `Bearer ${session.access_token}` }),
        ...init.headers,
      },
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ 
        message: 'Network error' 
      }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    
    return response.json();
  }
  
  async get<T>(endpoint: string, options?: RequestInit & { params?: Record<string, any> }): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }
  
  async post<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
  
  async put<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
  
  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
```

## Routing

### Route Configuration
```typescript
// app/(app)/layout.tsx - Protected routes
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  return <>{children}</>;
}

// middleware.ts - Route protection
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Protected routes
  const protectedRoutes = ['/canvas', '/video-editor', '/history'];
  const isProtectedRoute = protectedRoutes.some(route => 
    req.nextUrl.pathname.startsWith(route)
  );

  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Redirect to dashboard if logged in and accessing auth pages
  const authRoutes = ['/login', '/signup'];
  const isAuthRoute = authRoutes.some(route => 
    req.nextUrl.pathname.startsWith(route)
  );

  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL('/canvas', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

## Styling Guidelines

### Styling Approach
VogueDrop uses Tailwind CSS for styling with a utility-first approach. This enables rapid development while maintaining consistency across the application.

Key principles:
- Use Tailwind utilities for all styling
- Create custom components for repeated patterns
- Use CSS variables for theming
- Leverage Tailwind's dark mode support

### Global Theme Variables
```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Colors */
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 0 0% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 3.9%;
    --primary: 0 0% 9%;
    --primary-foreground: 0 0% 98%;
    --secondary: 0 0% 96.1%;
    --secondary-foreground: 0 0% 9%;
    --muted: 0 0% 96.1%;
    --muted-foreground: 0 0% 45.1%;
    --accent: 0 0% 96.1%;
    --accent-foreground: 0 0% 9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 89.8%;
    --input: 0 0% 89.8%;
    --ring: 0 0% 3.9%;
    --radius: 0.5rem;
    
    /* Spacing */
    --spacing-xs: 0.25rem;
    --spacing-sm: 0.5rem;
    --spacing-md: 1rem;
    --spacing-lg: 1.5rem;
    --spacing-xl: 2rem;
    --spacing-2xl: 3rem;
    
    /* Typography */
    --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    --font-mono: "SF Mono", Consolas, "Liberation Mono", monospace;
    
    /* Shadows */
    --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    --shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  }

  .dark {
    --background: 0 0% 3.9%;
    --foreground: 0 0% 98%;
    --card: 0 0% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 0 0% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 0 0% 9%;
    --secondary: 0 0% 14.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 0 0% 14.9%;
    --muted-foreground: 0 0% 63.9%;
    --accent: 0 0% 14.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 14.9%;
    --input: 0 0% 14.9%;
    --ring: 0 0% 83.1%;
  }
}

@layer components {
  /* Custom component styles */
  .btn-primary {
    @apply bg-primary text-primary-foreground hover:bg-primary/90 
           px-4 py-2 rounded-md font-medium transition-colors;
  }
  
  .modal-overlay {
    @apply fixed inset-0 bg-black/50 z-50 flex items-center justify-center;
  }
  
  .card {
    @apply rounded-lg border bg-card text-card-foreground shadow-sm;
  }
}
```

## Testing Requirements

### Component Test Template
```typescript
// __tests__/components/Canvas/EffectSelector.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EffectSelector } from '@/app/canvas/_components/EffectSelector';

// Mock dependencies
vi.mock('@/lib/api/services/canvas.service', () => ({
  canvasService: {
    getEffects: vi.fn().mockResolvedValue([
      { id: '1', name: 'RGB Split', category: 'effect' },
      { id: '2', name: 'Wave Flow', category: 'effect' },
    ]),
  },
}));

describe('EffectSelector', () => {
  const mockOnSelect = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders effect options', async () => {
    render(
      <EffectSelector 
        category="effect" 
        onSelect={mockOnSelect}
        selectedEffects={[]}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('RGB Split')).toBeInTheDocument();
      expect(screen.getByText('Wave Flow')).toBeInTheDocument();
    });
  });

  it('limits selection to 4 effects', async () => {
    const selectedEffects = ['1', '2', '3', '4'];
    
    render(
      <EffectSelector 
        category="effect" 
        onSelect={mockOnSelect}
        selectedEffects={selectedEffects}
        maxSelection={4}
      />
    );

    await waitFor(() => {
      const newEffect = screen.getByText('New Effect');
      fireEvent.click(newEffect);
      
      expect(mockOnSelect).not.toHaveBeenCalled();
      expect(screen.getByText('Maximum 4 effects')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    vi.mocked(canvasService.getEffects).mockRejectedValueOnce(
      new Error('Network error')
    );

    render(
      <EffectSelector 
        category="effect" 
        onSelect={mockOnSelect}
        selectedEffects={[]}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load effects')).toBeInTheDocument();
    });
  });
});
```

### Testing Best Practices
1. **Unit Tests**: Test individual components in isolation
2. **Integration Tests**: Test component interactions
3. **E2E Tests**: Test critical user flows (using Cypress/Playwright)
4. **Coverage Goals**: Aim for 80% code coverage
5. **Test Structure**: Arrange-Act-Assert pattern
6. **Mock External Dependencies**: API calls, routing, state management

## Environment Configuration

```bash
# .env.local - Frontend environment variables
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_FAL_API_URL=https://api.fal.ai
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Feature flags
NEXT_PUBLIC_ENABLE_VIDEO_EDITOR=true
NEXT_PUBLIC_ENABLE_SOCIAL_LOGIN=false

# Analytics (optional)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=your-analytics-id
```

## Frontend Developer Standards

### Critical Coding Rules
1. **Always use TypeScript**: Never use `any` type, define proper interfaces
2. **Component Organization**: Use feature-based folders with `_components` and `_hooks`
3. **Client Components**: Mark with `"use client"` only when necessary (state, effects, browser APIs)
4. **Error Boundaries**: Wrap feature sections with error boundaries
5. **Loading States**: Always show loading indicators during async operations
6. **Accessibility**: Use semantic HTML, ARIA labels, keyboard navigation
7. **Image Optimization**: Use Next.js Image component for all images
8. **API Error Handling**: Always handle errors with user-friendly messages
9. **Form Validation**: Validate on client before submission
10. **Performance**: Lazy load heavy components, use React.memo for expensive renders

### Quick Reference

**Common Commands:**
```bash
# Development
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript compiler

# Testing
npm test            # Run unit tests
npm run test:watch  # Run tests in watch mode
npm run test:e2e    # Run E2E tests
```

**Key Import Patterns:**
```typescript
// Components
import { ComponentName } from '@/components/ui/ComponentName';
import { FeatureComponent } from '@/app/feature/_components/FeatureComponent';

// Hooks
import { useCanvas } from '@/app/canvas/_hooks/useCanvas';
import { useAuth } from '@/hooks/useAuth';

// Services
import { canvasService } from '@/lib/api/services/canvas.service';

// Types
import type { VideoGeneration } from '@/types/api';
import type { Database } from '@/types/database';

// Utils
import { cn } from '@/lib/utils/cn';
```

**File Naming Conventions:**
- Components: `ComponentName.tsx`
- Hooks: `useHookName.ts`
- Services: `service-name.service.ts`
- Types: `type-name.ts`
- Utils: `util-name.ts`

**Project-Specific Patterns:**
- Modal Management: Use portal pattern with `@/components/modals`
- Feature Hooks: Create custom hooks in `_hooks` folder
- API Integration: Use service layer pattern
- State Management: Local state with hooks, prepare for Zustand
- Error Handling: Consistent error boundaries and toast notifications

## Component Library Architecture

### Base UI Components
Located in `components/ui/`, these are the foundational building blocks:
- Button
- Input
- Modal
- Card
- Select
- Tooltip

### Feature Components
Located in `app/[feature]/_components/`, these are feature-specific:
- Canvas components (ImageSection, EffectsSection, etc.)
- Video Editor components (Timeline, VideoPreview, etc.)

### Shared Components
Located in `components/`, these are used across features:
- Layout components (Header, Footer)
- Modal components (shared across features)
- Common patterns (LoadingSpinner, ErrorBoundary)

## Performance Optimization Guidelines

1. **Code Splitting**: Use dynamic imports for heavy components
2. **Image Optimization**: Always use Next.js Image with proper sizing
3. **Bundle Size**: Monitor with `@next/bundle-analyzer`
4. **Caching**: Leverage SWR or React Query for data fetching (future)
5. **Memoization**: Use React.memo and useMemo for expensive operations
6. **Virtual Lists**: Implement for large lists (video history)

## Security Best Practices

1. **Input Sanitization**: Sanitize all user inputs
2. **XSS Prevention**: Use React's built-in escaping
3. **CSP Headers**: Configure in next.config.js
4. **Secure Storage**: Never store sensitive data in localStorage
5. **API Security**: Always validate on backend, frontend validation is UX only

## Deployment Considerations

1. **Build Optimization**: Use production builds with proper env vars
2. **Static Generation**: Leverage SSG where possible
3. **Edge Functions**: Use for API routes when applicable
4. **CDN Strategy**: Serve assets through Vercel's CDN
5. **Monitoring**: Implement error tracking and analytics