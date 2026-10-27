# Reel DNA — corrected project

This archive contains the application source and configuration from the uploaded project, with generated folders and private secrets excluded.

## Main correction

Video-frame role classification previously existed in two separate places: the frame report used topic-specific regular expressions, while the alternative-sequence builder used a second set of regular expressions. Those rules drifted and caused the same frame to receive different roles.

The updated `src/app/api/analyze/route.ts` asks the vision model to assign one topic-independent semantic role to each frame and validates that role against a fixed schema. The same role is then reused for the frame report and both suggested sequences.

Semantic roles:
- `hook`
- `setup`
- `product_showcase`
- `demonstration`
- `transition`
- `payoff`
- `call_to_action`
- `other`

The prompt explicitly says not to infer a role from genre/topic alone, not to confuse showing an object with using it, and not to treat the last sampled frame as a result automatically. This removes the duplicated topic-specific keyword classifiers. It cannot guarantee perfect interpretation of every video: visual model output still depends on frame quality and the model's judgment.

## Setup

1. Install Node.js 22 or a compatible supported version.
2. Copy `.env.example` to `.env.local` and fill in your own values. Do not share `.env.local`.
3. Install packages with `npm ci`.
4. Run `npm run dev`.
5. Verify with `npm run build` and test several short videos from different genres.

Required environment:
- `ANTHROPIC_API_KEY` — Anthropic API key with access/billing enabled.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — Supabase project settings.
- `REPORT_LANG` — optional, `en` (default) or `uk`.
- `ANTHROPIC_MODEL` — optional, defaults to `claude-sonnet-4-6`.

## Verification note

A build could not be completed in this workspace because package installation (`npm ci`) timed out before dependencies were installed. The archive therefore should be treated as a corrected source package awaiting a local build check, not as a claim that a production build has passed. Run `npm ci` and `npm run build` on your Mac before deploying.
## Additional scoring corrections

- Low brightness is no longer treated as an automatic defect when the main subject is still identifiable. This is intended to reduce false penalties for deliberate candlelit/nighttime aesthetics.
- Sharpness heuristics are more conservative in low-light frames because Laplacian sharpness is sensitive to darkness and noise reduction. Near-zero values can still trigger a review warning.
- These changes reduce known false positives; they do not guarantee perfect analysis. The vision model still assesses sampled still frames, not full motion, audio, or actual audience retention.

## Validation status

The source archive was checked for ZIP integrity. Dependency installation timed out in this environment, so a full Next.js production build and lint run could not be completed here. Run `npm ci`, `npm run lint`, and `npm run build` locally before deployment.
