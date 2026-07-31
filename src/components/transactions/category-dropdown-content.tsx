"use client";

import { useTranslations } from "next-intl";
import {
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { translateCategoryName } from "@/lib/i18n-data";
import type { Category } from "@/lib/types";

interface CategoryDropdownContentProps {
  categories: Category[];
  onSelect: (categoryId: number) => void;
  align?: "center" | "end" | "start";
}

export function CategoryDropdownContent({
  categories,
  onSelect,
  align = "start",
}: CategoryDropdownContentProps) {
  const tCat = useTranslations("categoriesSeeded");

  return (
    <DropdownMenuContent
      align={align}
      className="max-h-[300px] min-w-[200px] overflow-y-auto"
    >
      {categories
        .filter((c) => c.parentId === null)
        .map((parent) => {
          const children = categories.filter((c) => c.parentId === parent.id);
          return (
            <DropdownMenuGroup key={parent.id}>
              <DropdownMenuLabel className="pb-1 font-semibold text-muted-foreground">
                {translateCategoryName(parent.name, tCat, parent.localName)}
              </DropdownMenuLabel>
              {children.length > 0 ? (
                children.map((child) => (
                  <DropdownMenuItem
                    key={child.id}
                    onClick={() => onSelect(child.id)}
                    className="ps-6"
                  >
                    <div
                      className="me-2 h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: child.color }}
                    />
                    {translateCategoryName(child.name, tCat, child.localName)}
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem
                  key={parent.id}
                  onClick={() => onSelect(parent.id)}
                  className="ps-6"
                >
                  <div
                    className="me-2 h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: parent.color }}
                  />
                  {translateCategoryName(parent.name, tCat, parent.localName)}
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
          );
        })}
    </DropdownMenuContent>
  );
}
