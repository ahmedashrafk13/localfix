import { ClipboardTextIcon, PlusIcon } from '@phosphor-icons/react';
import { useSearchParams } from 'react-router';
import { RequestCard } from '../../components/RequestCard.jsx';
import { ButtonLink } from '../../components/ui/Button.jsx';
import { PageHeader, Pagination, Tabs } from '../../components/ui/Nav.jsx';
import { CardListSkeleton, EmptyState, ErrorState } from '../../components/ui/States.jsx';
import { useApi, useDocumentTitle } from '../../lib/hooks.js';

const TABS = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'assigned', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function MyRequests() {
  useDocumentTitle('My requests');
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const page = Number(params.get('page')) || 1;
  const { data, loading, error, reload } = useApi('/requests/mine', { status, page });

  return (
    <div className="container-page py-8 sm:py-10">
      <PageHeader
        title="My requests"
        description="Everything you have posted, newest first."
        actions={
          <ButtonLink to="/post-request" icon={PlusIcon}>
            Post a request
          </ButtonLink>
        }
      />
      <Tabs className="mb-6" label="Filter by status" value={status} onChange={(v) => setParams(v ? { status: v } : {}, { replace: true })} items={TABS} />
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !data ? (
        <CardListSkeleton count={4} />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={ClipboardTextIcon}
          title={status ? 'Nothing here yet' : 'You have not posted a request yet'}
          description="Describe what needs fixing and get offers from verified providers near you."
          action={<ButtonLink to="/post-request">Post a request</ButtonLink>}
        />
      ) : (
        <>
          <ul className={`grid gap-3 ${loading ? 'opacity-60' : ''}`}>
            {data.items.map((r) => (
              <li key={r.id}>
                <RequestCard request={r} showStatus showCustomer={false} />
              </li>
            ))}
          </ul>
          <Pagination
            className="mt-8"
            page={data.page}
            pages={data.pages}
            onChange={(p) => setParams({ ...(status ? { status } : {}), page: String(p) }, { replace: true })}
          />
        </>
      )}
    </div>
  );
}
