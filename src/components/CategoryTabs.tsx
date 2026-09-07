import type { Category } from "@/data/category";
import { memo } from "react";
import styles from "./CategoryTabs.module.css";

type Props = {
  data: Category[];
  activeCategory: string;
  onSelect: (id: string) => void;
};

function CategoryTabs({ data, activeCategory, onSelect }: Props) {
  return (
    <div className={styles.container}>
      <button
        onClick={() => onSelect("all")}
        className={styles.button}
        style={{ backgroundColor: activeCategory === "all" ? "#ED3237" : "#848688" }}
      >
        All
      </button>

      {data.map((item) => {
        const isActive = item.id === activeCategory;
        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={styles.button}
            style={{ backgroundColor: isActive ? "#ED3237" : "#848688" }}
          >
            {item.title}
          </button>
        );
      })}
    </div>
  );
}

// Only re-renders when the active category or the category list itself
// changes — typing in search no longer re-renders every tab.
export default memo(CategoryTabs);
