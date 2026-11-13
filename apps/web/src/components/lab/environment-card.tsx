"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { errorMessage, formatReport, megabytes, type ReportLine } from "@/lib/lab/report";
import { LabCard, LabResult } from "./lab-card";

/** Installed mode, user agent, service worker, storage estimate and persistence. */
export function EnvironmentCard() {
  const t = useTranslations("lab");
  const locale = useLocale();
  const [report, setReport] = useState("");

  async function run() {
    const yesNo = (value: boolean) => t(value ? "value.yes" : "value.no");
    const lines: ReportLine[] = [];

    // iOS Safari exposes `navigator.standalone`; other browsers the display-mode media query.
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    lines.push([t("environment.installed"), yesNo(standalone)]);
    lines.push([t("environment.userAgent"), navigator.userAgent]);
    lines.push([t("environment.secureContext"), yesNo(window.isSecureContext)]);

    let serviceWorker = t("environment.swUnsupported");
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        serviceWorker = !registration
          ? t("environment.swNone")
          : navigator.serviceWorker.controller
            ? t("environment.swControlling")
            : t("environment.swRegistered");
      } catch (error) {
        serviceWorker = t("value.error", { message: errorMessage(error) });
      }
    }
    lines.push([t("environment.serviceWorker"), serviceWorker]);

    if (navigator.storage?.estimate) {
      try {
        const { usage, quota } = await navigator.storage.estimate();
        lines.push([t("environment.storageUsed"), usage === undefined ? t("value.unknown") : t("value.megabytes", { value: megabytes(usage, locale) })]);
        lines.push([t("environment.storageQuota"), quota === undefined ? t("value.unknown") : t("value.megabytes", { value: megabytes(quota, locale) })]);
      } catch (error) {
        lines.push([t("environment.storageUsed"), t("value.error", { message: errorMessage(error) })]);
      }
    } else {
      lines.push([t("environment.storageUsed"), t("environment.storageUnsupported")]);
    }

    if (navigator.storage?.persisted) {
      try {
        const before = await navigator.storage.persisted();
        lines.push([t("environment.persistedBefore"), yesNo(before)]);
        if (!before && navigator.storage.persist) {
          lines.push([t("environment.persistedAfter"), yesNo(await navigator.storage.persist())]);
        }
      } catch (error) {
        lines.push([t("environment.persistedBefore"), t("value.error", { message: errorMessage(error) })]);
      }
    }
    setReport(formatReport(lines));
  }

  return (
    <LabCard title={t("environment.title")} hint={t("environment.hint")}>
      <Button variant="secondary" onClick={run}>
        {t("environment.run")}
      </Button>
      <LabResult text={report} />
    </LabCard>
  );
}
