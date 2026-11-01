CREATE TABLE IF NOT EXISTS public.stock_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mitra_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity_changed INTEGER NOT NULL,
    reason VARCHAR(100) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_stock_adjustments_mitra_id ON public.stock_adjustments(mitra_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_product_id ON public.stock_adjustments(product_id);

ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stock_adjustments_select_policy" ON public.stock_adjustments;
CREATE POLICY "stock_adjustments_select_policy"
    ON public.stock_adjustments
    FOR SELECT
    TO authenticated
    USING (
        mitra_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.partner_stores
            WHERE partner_stores.id = stock_adjustments.mitra_id
            AND partner_stores.owner_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'pemilik')
        )
    );

DROP POLICY IF EXISTS "stock_adjustments_insert_policy" ON public.stock_adjustments;
CREATE POLICY "stock_adjustments_insert_policy"
    ON public.stock_adjustments
    FOR INSERT
    TO authenticated
    WITH CHECK (
        mitra_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.partner_stores
            WHERE partner_stores.id = stock_adjustments.mitra_id
            AND partner_stores.owner_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'pemilik')
        )
    );

DROP FUNCTION IF EXISTS public.adjust_physical_stock(UUID, UUID, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.adjust_physical_stock(TEXT, TEXT, INTEGER, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.adjust_physical_stock(
    p_mitra_id TEXT,
    p_product_id TEXT,
    p_qty_changed INTEGER,
    p_reason TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_target_store_id UUID;
    v_resolved_user_id UUID;
    v_parsed_product_id UUID;
    v_current_stock INTEGER;
    v_new_stock INTEGER;
BEGIN
    v_parsed_product_id := p_product_id::UUID;

    -- Validasi target gerai mitra berdasarkan ID toko atau owner akun
    SELECT id, owner_id INTO v_target_store_id, v_resolved_user_id
    FROM public.partner_stores
    WHERE id = p_mitra_id::UUID
    LIMIT 1;

    IF v_target_store_id IS NULL THEN
        SELECT id, owner_id INTO v_target_store_id, v_resolved_user_id
        FROM public.partner_stores
        WHERE owner_id = p_mitra_id::UUID
        LIMIT 1;
    END IF;

    IF v_target_store_id IS NULL THEN
        v_target_store_id := p_mitra_id::UUID;
        v_resolved_user_id := p_mitra_id::UUID;
    END IF;

    -- Penyesuaian stok gerai mitra secara atomik
    SELECT stock_quantity INTO v_current_stock
    FROM public.partner_store_inventory
    WHERE partner_store_id = v_target_store_id
      AND product_id = v_parsed_product_id
    FOR UPDATE;

    IF v_current_stock IS NULL THEN
        v_current_stock := 0;
        v_new_stock := GREATEST(0, v_current_stock + p_qty_changed);

        INSERT INTO public.partner_store_inventory (
            partner_store_id,
            product_id,
            stock_quantity,
            updated_at
        ) VALUES (
            v_target_store_id,
            v_parsed_product_id,
            v_new_stock,
            timezone('utc'::text, now())
        );
    ELSE
        v_new_stock := GREATEST(0, v_current_stock + p_qty_changed);

        UPDATE public.partner_store_inventory
        SET stock_quantity = v_new_stock,
            updated_at = timezone('utc'::text, now())
        WHERE partner_store_id = v_target_store_id
          AND product_id = v_parsed_product_id;
    END IF;

    -- Pencatatan riwayat audit stock opname
    INSERT INTO public.stock_adjustments (
        mitra_id,
        product_id,
        quantity_changed,
        reason,
        notes,
        created_at
    ) VALUES (
        v_resolved_user_id,
        v_parsed_product_id,
        p_qty_changed,
        p_reason,
        p_notes,
        timezone('utc'::text, now())
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Penyesuaian stok berhasil disimpan.',
        'previous_stock', v_current_stock,
        'new_stock', v_new_stock
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.adjust_physical_stock(TEXT, TEXT, INTEGER, TEXT, TEXT) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

