import React from "react";
import { ModelsCatalog } from "@/components";
import { useTranslation } from "@/context/TranslationContext";

export const AboutProject: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold font-display text-main">{t("about_title")}</h2>
        <p className="text-xs text-muted">
          {t("about_desc")}
        </p>
      </div>

      <ModelsCatalog />
    </div>
  );
};
export default AboutProject;
