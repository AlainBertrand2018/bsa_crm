import { COMPANY_DETAILS } from '@/lib/constants';
import { BusinessDetails } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';

interface DocumentHeaderProps {
  businessDetails?: BusinessDetails;
}

export function DocumentHeader({ businessDetails }: DocumentHeaderProps) {
  const { currentUser } = useAuth();

  // Priority: 1. Passed prop, 2. Logged in user's details, 3. Hardcoded constant
  const activeDetails = businessDetails || currentUser?.businessDetails || COMPANY_DETAILS;

  const name = ('businessName' in activeDetails ? activeDetails.businessName : '') || ('name' in activeDetails ? activeDetails.name : '');
  const brn = activeDetails.brn;
  const vat = ('vatNo' in activeDetails ? activeDetails.vatNo : '') || ('vat' in activeDetails ? activeDetails.vat : '');
  const address = ('businessAddress' in activeDetails ? activeDetails.businessAddress : '') || ('address' in activeDetails ? activeDetails.address : '');
  const tel = ('telephone' in activeDetails ? activeDetails.telephone : '') || ('tel' in activeDetails ? activeDetails.tel : '');
  const email = activeDetails.email;
  const website = ('website' in activeDetails ? activeDetails.website : '') || ('url' in activeDetails ? activeDetails.url : '');

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
