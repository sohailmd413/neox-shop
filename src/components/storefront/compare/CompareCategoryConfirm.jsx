import React from "react";
import { useCompare } from "@/lib/CompareContext";
import { useLanguage } from "@/lib/i18n";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";

// When a customer tries to add a product from a different category, the
// compare context parks it as `pendingDiff`; this prompt offers to start a
// fresh comparison (replacing the current items) or keep what they have.
export default function CompareCategoryConfirm() {
  const { t } = useLanguage();
  const { pendingDiff, replaceAll, clearPending } = useCompare();
  return (
    <ConfirmDialog
      open={!!pendingDiff}
      onClose={clearPending}
      variant="warning"
      title={t("compare.diffTitle")}
      description={t("compare.diffDesc")}
      confirmLabel={t("compare.diffConfirm")}
      cancelLabel={t("compare.diffKeep")}
      onConfirm={() => { if (pendingDiff) replaceAll(pendingDiff); }}
    />
  );
}