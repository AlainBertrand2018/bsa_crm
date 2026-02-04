import { COMPANY_DETAILS } from '@/lib/constants';
import { BusinessDetails } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';

interface DocumentHeaderProps {
  businessDetails?: BusinessDetails;
}

export function DocumentHeader({ businessDetails }: DocumentHeaderProps) {
  const { currentUser } = useAuth();

  // Priority: 1. Passed prop, 2. Logged in user's details, 3. Hardcoded constant
  // We check if businessName or name exists to avoid using an empty object
  const hasDetails = (details: any) => details && (details.businessName || details.name);

  const activeDetails = (hasDetails(businessDetails)
    ? businessDetails
    : (hasDetails(currentUser?.businessDetails) ? currentUser?.businessDetails : COMPANY_DETAILS)) as any;

  const name = String(activeDetails?.businessName || activeDetails?.name || 'N/A');
  const brn = String(activeDetails?.brn || 'N/A');
  const vat = String(activeDetails?.vatNo || activeDetails?.vat || 'N/A');
  const address = String(activeDetails?.businessAddress || activeDetails?.address || 'N/A');
  const tel = String(activeDetails?.telephone || activeDetails?.tel || 'N/A');
  const email = String(activeDetails?.email || 'N/A');
  const website = String(activeDetails?.website || activeDetails?.url || '');

  return (
    <div className="mb-8 p-6 bg-card rounded-lg shadow">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-10 w-10 text-primary"
              aria-label={`${name} Logo`}
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
            </svg>
            <h2 className="text-2xl font-bold text-primary font-headline">{name}</h2>
          </div>
          <p className="text-sm text-muted-foreground">BRN: {brn} • VAT: {vat}</p>
        </div>
        <div className="text-sm text-right">
          <p>{address}</p>
          <p>Tel: {tel}</p>
          <p>Email: <a href={`mailto:${email}`} className="text-primary hover:underline">{email}</a></p>
          {website && (
            <p>URL: <a href={`https://${website}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{website}</a></p>
          )}
        </div>
      </div>
    </div>
  );
}
