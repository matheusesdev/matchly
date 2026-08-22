# Matchly project context

React + TypeScript + Vite frontend for an AI-assisted resume tailoring product.

## Conventions
- UI copy is Brazilian Portuguese.
- Components use PascalCase; variables and functions use camelCase.
- Keep the experience accessible and mobile-first.
- Use Phosphor Icons for interface icons.
- Never expose Gemini or other private API keys in client-side code. All AI calls must go through a Supabase Edge Function.
- AI-generated resume content may reorder, rephrase, and emphasize existing facts, but must never invent experience, skills, dates, metrics, or credentials.

## Planned data model
- `resumes`: id, user_id, original_filename, raw_text, created_at.
- `analyses`: id, user_id, resume_id, job_text, match_score, missing_keywords, gaps, optimized_resume_text, created_at.
- Both tables must use RLS so users can only access their own records.
