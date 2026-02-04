
-- Enable Row Level Security
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.statements ENABLE ROW LEVEL SECURITY;

-- 1. Profiles (extending auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  email TEXT,
  role TEXT DEFAULT 'User',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  business_name TEXT,
  business_address TEXT,
  brn TEXT,
  vat_no TEXT,
  telephone TEXT,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Clients
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  client_name TEXT NOT NULL,
  client_company TEXT,
  client_email TEXT,
  client_phone TEXT,
  client_address TEXT,
  client_brn TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Products
CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT, -- 'Digital DL', 'Service', 'Physical'
  description TEXT,
  unit_price DECIMAL(12,2) DEFAULT 0,
  bulk_price DECIMAL(12,2) DEFAULT 0,
  rrp DECIMAL(12,2) DEFAULT 0,
  min_order INTEGER DEFAULT 1,
  inventory INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Quotations
CREATE TABLE IF NOT EXISTS public.quotations (
  id TEXT PRIMARY KEY, -- Using the string ID format (e.g., Q-CHA-...)
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients ON DELETE SET NULL,
  quotation_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  sub_total DECIMAL(12,2) DEFAULT 0,
  discount DECIMAL(12,2) DEFAULT 0,
  vat_amount DECIMAL(12,2) DEFAULT 0,
  grand_total DECIMAL(12,2) DEFAULT 0,
  status TEXT DEFAULT 'To Send',
  notes TEXT,
  currency TEXT DEFAULT 'MUR',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Invoices (Updated with status and total_paid)
CREATE TABLE IF NOT EXISTS public.invoices (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  quotation_id TEXT REFERENCES public.quotations(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients ON DELETE SET NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  sub_total DECIMAL(12,2) DEFAULT 0,
  discount DECIMAL(12,2) DEFAULT 0,
  vat_amount DECIMAL(12,2) DEFAULT 0,
  grand_total DECIMAL(12,2) DEFAULT 0,
  total_paid DECIMAL(12,2) DEFAULT 0,
  status TEXT DEFAULT 'To Send', -- 'To Send', 'Sent', 'Partly Paid', 'Fully Paid'
  notes TEXT,
  currency TEXT DEFAULT 'MUR',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Receipts (Updated with invoice_id)
CREATE TABLE IF NOT EXISTS public.receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  invoice_id TEXT REFERENCES public.invoices(id) ON DELETE SET NULL,
  invoice_number TEXT,
  date DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_method TEXT,
  client_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Statements
CREATE TABLE IF NOT EXISTS public.statements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients ON DELETE SET NULL,
  client_name TEXT,
  period TEXT,
  date DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  status TEXT DEFAULT 'To Send', -- 'Sent', 'To Send'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --- AUTOMATION TRIGGERS ---

-- A. Create Invoice when Quotation is 'Won'
CREATE OR REPLACE FUNCTION public.fn_create_invoice_from_won_quotation()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.status = 'Won' AND (OLD.status IS NULL OR OLD.status != 'Won')) THEN
    INSERT INTO public.invoices (
      id, user_id, quotation_id, client_id, invoice_date, due_date, 
      items, sub_total, discount, vat_amount, grand_total, status, currency
    )
    VALUES (
      REPLACE(NEW.id, 'Q-', 'INV-'),
      NEW.user_id,
      NEW.id,
      NEW.client_id,
      CURRENT_DATE,
      CURRENT_DATE + 15, -- Default 15 days due
      NEW.items,
      NEW.sub_total,
      NEW.discount,
      NEW.vat_amount,
      NEW.grand_total,
      'To Send',
      NEW.currency
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER tr_quotation_won_to_invoice
AFTER UPDATE ON public.quotations
FOR EACH ROW
EXECUTE FUNCTION public.fn_create_invoice_from_won_quotation();

-- B. Update Invoice status when Receipt is added
CREATE OR REPLACE FUNCTION public.fn_update_invoice_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_grand_total DECIMAL(12,2);
  v_total_paid DECIMAL(12,2);
BEGIN
  IF NEW.invoice_id IS NOT NULL THEN
    -- Get current total paid
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
    FROM public.receipts
    WHERE invoice_id = NEW.invoice_id;

    -- Get invoice grand total
    SELECT grand_total INTO v_grand_total
    FROM public.invoices
    WHERE id = NEW.invoice_id;

    -- Update invoice
    UPDATE public.invoices
    SET 
      total_paid = v_total_paid,
      status = CASE 
        WHEN v_total_paid >= v_grand_total THEN 'Fully Paid'
        WHEN v_total_paid > 0 THEN 'Partly Paid'
        ELSE status
      END
    WHERE id = NEW.invoice_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER tr_receipt_added_update_invoice
AFTER INSERT OR UPDATE ON public.receipts
FOR EACH ROW
EXECUTE FUNCTION public.fn_update_invoice_on_payment();

-- C. Automatic Statement Generation for Overdue Invoices
CREATE OR REPLACE FUNCTION public.fn_generate_overdue_statements()
RETURNS void AS $$
BEGIN
  INSERT INTO public.statements (
    user_id, client_id, client_name, date, amount, status, period
  )
  SELECT 
    i.user_id, 
    i.client_id, 
    c.client_name,
    CURRENT_DATE,
    i.grand_total - i.total_paid,
    'To Send',
    'Overdue Statement'
  FROM public.invoices i
  JOIN public.clients c ON i.client_id = c.id
  WHERE i.status != 'Fully Paid' 
    AND i.due_date <= (CURRENT_DATE - INTERVAL '15 days')
    AND NOT EXISTS (
      SELECT 1 FROM public.statements s 
      WHERE s.client_id = i.client_id 
        AND s.date = CURRENT_DATE 
        AND s.period = 'Overdue Statement'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can manage their own clients" ON public.clients FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own products" ON public.products FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own quotations" ON public.quotations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own invoices" ON public.invoices FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own receipts" ON public.receipts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own statements" ON public.statements FOR ALL USING (auth.uid() = user_id);
