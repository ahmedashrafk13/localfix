import { TagIcon } from '@phosphor-icons/react';
import { eta, pkr } from '../../lib/format.js';
import { useApi } from '../../lib/hooks.js';

/**
 * Typical prices for a category, from real offers on LocalFix (GET /api/insights/price).
 * `audience` changes the wording: customers set a budget, providers price an offer.
 * `onUse(low, high)` adds a button that copies the range into the form.
 */
export function PriceGuide({ categorySlug, audience = 'customer', onUse }) {
  const { data } = useApi('/insights/price', { category: categorySlug }, { enabled: Boolean(categorySlug) });
  const insight = data?.insight;
  if (!insight) return null;
  const name = data.category.name.toLowerCase();
  const source = insight.basis === 'accepted' ? `${insight.sample} accepted offers` : `${insight.sample} offers sent`;

  return (
    <aside className="rounded-2xl border border-line bg-surface-2 p-4" aria-label="Price guide">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
        <TagIcon size={18} className="text-accent-text" aria-hidden="true" />
        {audience === 'provider' ? `What ${name} jobs go for` : `Typical price for ${name}`}
      </p>
      <p className="mt-2 font-display text-2xl font-bold tabular-nums text-ink">
        {pkr(insight.low)} <span className="text-base font-semibold text-muted">to</span> {pkr(insight.high)}
      </p>
      {/* The middle half of prices, with the median marked. */}
      <div className="relative mt-3 h-2 rounded-full bg-line" aria-hidden="true">
        <span className="absolute inset-y-0 left-[15%] right-[15%] rounded-full bg-accent/70" />
        <span
          className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-ink"
          style={{ left: `${15 + (insight.high > insight.low ? ((insight.median - insight.low) / (insight.high - insight.low)) * 70 : 35)}%` }}
        />
      </div>
      <p className="mt-2.5 text-[0.82rem] text-muted">
        Most jobs land in this range; the middle price is <span className="font-semibold text-ink-2">{pkr(insight.median)}</span>. Based on {source} on LocalFix
        {insight.typicalEtaMinutes ? `, with providers usually arriving within ${eta(insight.typicalEtaMinutes)}` : ''}.
        {audience === 'provider' && insight.avgOffersPerRequest ? ` You are usually competing with about ${Math.max(1, Math.round(insight.avgOffersPerRequest) - 1)} other offers.` : ''}
      </p>
      {onUse && (
        <button type="button" onClick={() => onUse(insight.low, insight.high)} className="mt-2 min-h-9 text-sm font-semibold text-accent-text underline-offset-2 hover:underline">
          Use this range as my budget
        </button>
      )}
    </aside>
  );
}
