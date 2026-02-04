import { COMPANY_DETAILS } from '@/lib/constants';
import { BusinessDetails } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/shared/Logo';
import { isValidBRN } from '@/lib/utils';

interface DocumentHeaderProps {
  businessDetails?: BusinessDetails;
}

export function DocumentHeader({ businessDetails }: DocumentHeaderProps) {
  const { currentUser } = useAuth();

  // Priority: 1. Passed prop, 2. Logged in user's details, 3. Hardcoded constant
  // We check if businessName or name exists to avoid using an empty object
  const hasDetails = (details: any) => details && (details.businessName || details.name);

  const activeDetails = (hasDetails(businessDetails) ? businessDetails : COMPANY_DETAILS) as any;

  const name = String(activeDetails?.businessName || activeDetails?.name || 'N/A');
  const rawBrn = String(activeDetails?.brn || 'N/A');
  const brn = isValidBRN(rawBrn) ? rawBrn : ''; // Only show if valid

  const vat = String(activeDetails?.vatNo || activeDetails?.vat || 'N/A');
  const address = String(activeDetails?.businessAddress || activeDetails?.address || 'N/A');
  const tel = String(activeDetails?.telephone || activeDetails?.tel || 'N/A');
  const email = String(activeDetails?.email || 'N/A');
  const website = String(activeDetails?.website || activeDetails?.url || '');

  return (
    <div className="mb-8 p-6 bg-card rounded-lg shadow">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Logo businessName={name} className="mb-2" />
          <div className="flex flex-wrap gap-x-4 text-sm text-muted-foreground">
            {brn && brn !== 'N/A' && <span>BRN: {brn}</span>}
            {vat && vat !== 'N/A' && <span>VAT: {vat}</span>}
          </div>
        </div>
        <div className="text-sm text-right">
          <p>{address}</p>
          {tel && tel !== 'N/A' && <p>Tel: {tel}</p>}
          {email && email !== 'N/A' && (
            <p>Email: <a href={`mailto:${email}`} className="text-primary hover:underline">{email}</a></p>
          )}
          {website && website !== 'N/A' && (
            <p>URL: <a href={`https://${website}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{website}</a></p>
          )}
        </div>
      </div>
    </div>
  );
}
