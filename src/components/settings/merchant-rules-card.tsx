"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { SettingCard } from "@/components/settings/section-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, EyeOff, Edit3 } from "lucide-react";
import { toast } from "sonner";
import { listMerchantRules, deleteMerchantRule } from "@/lib/api";
import { BANK_PROVIDERS } from "@/lib/types";
import { translateProviderName } from "@/lib/i18n-data";

export function MerchantRulesCard() {
  const t = useTranslations("settings.data");
  const tBanks = useTranslations("banks");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();

  const [isAdding, setIsAdding] = useState(false);
  const [provider, setProvider] = useState<string>("all");
  const [merchantKey, setMerchantKey] = useState("");
  const [matchType, setMatchType] = useState<"exact" | "contains" | "starts_with">("exact");
  const [action, setAction] = useState<"exclude" | "normalize">("exclude");
  const [normalizedName, setNormalizedName] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["merchant-rules"],
    queryFn: listMerchantRules,
  });

  const addMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/merchant-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to add rule");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-rules"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      queryClient.invalidateQueries({ queryKey: ["home"] });
      toast.success("Rule added successfully");
      setIsAdding(false);
      setMerchantKey("");
      setNormalizedName("");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to add rule");
    },
  });

  const removeMutation = useMutation({
    mutationFn: deleteMerchantRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-rules"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      queryClient.invalidateQueries({ queryKey: ["home"] });
      toast.success("Rule removed");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to remove rule");
    },
  });

  const handleAdd = () => {
    if (!merchantKey) return;
    addMutation.mutate({
      provider: provider === "all" ? null : provider,
      merchantKey,
      matchType,
      action,
      normalizedName: action === "normalize" ? normalizedName : null,
    });
  };

  const rules = data?.rules ?? [];

  return (
    <SettingCard
      title="Smart Merchant Rules"
      description="Automatically exclude phantom transactions or rename messy merchant descriptions during sync."
    >
      <div className="mb-4">
        {!isAdding ? (
          <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>
            + Add New Rule
          </Button>
        ) : (
          <div className="rounded-lg border bg-card p-4 space-y-4">
            <h4 className="text-sm font-medium">Create Rule</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>If description</Label>
                <Select value={matchType} onValueChange={(v: any) => setMatchType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exact">is exactly</SelectItem>
                    <SelectItem value="contains">contains</SelectItem>
                    <SelectItem value="starts_with">starts with</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Text to match</Label>
                <Input
                  value={merchantKey}
                  onChange={(e) => setMerchantKey(e.target.value)}
                  placeholder="e.g. WAH EUR"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Then</Label>
                <Select value={action} onValueChange={(v: any) => setAction(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exclude">Exclude it (Hide)</SelectItem>
                    <SelectItem value="normalize">Rename it</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {action === "normalize" && (
                <div className="space-y-2">
                  <Label>New Name</Label>
                  <Input
                    value={normalizedName}
                    onChange={(e) => setNormalizedName(e.target.value)}
                    placeholder="e.g. Wizz Air"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Provider restriction</Label>
              <Select value={provider} onValueChange={(v) => setProvider(v || "all")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Account</SelectItem>
                  {BANK_PROVIDERS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {translateProviderName(p.id, p.name, tBanks)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
                {tCommon("cancel")}
              </Button>
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={!merchantKey || (action === "normalize" && !normalizedName) || addMutation.isPending}
              >
                Save Rule
              </Button>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">{t("excludedLoading")}</div>
      ) : rules.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground">
          No rules defined yet.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {rules.map((rule) => {
            const info = rule.provider ? BANK_PROVIDERS.find((b) => b.id === rule.provider) : null;
            const providerName = rule.provider ? translateProviderName(
              rule.provider,
              info?.name ?? rule.provider,
              tBanks,
            ) : "Any Account";

            return (
              <li
                key={rule.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    {rule.action === "exclude" ? (
                      <EyeOff className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    ) : (
                      <Edit3 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate font-medium">
                      [{rule.matchType}] "{rule.merchantKey}"
                    </span>
                    <span className="text-muted-foreground text-xs">
                      → {rule.action === "exclude" ? "Exclude" : `Rename to "${rule.normalizedName}"`}
                    </span>
                  </div>
                  <div className="ms-5 text-[11px] text-muted-foreground">
                    {providerName}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
                  onClick={() => removeMutation.mutate(rule.id)}
                  disabled={removeMutation.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </SettingCard>
  );
}
