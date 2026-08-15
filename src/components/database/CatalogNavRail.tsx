"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  NAV_SECTION_LABELS,
  NAV_SECTION_ORDER,
  OTHER_NAV_ITEMS,
  STICKER_TOURNAMENTS,
  uniqueWeaponsForSection,
  weaponCases,
  type NavFilter,
  type NavSection,
} from "@/lib/cs-catalog";
import type { CatalogNavRailProps } from "@/types/catalog-ui";

type MenuPosition = {
  top: number;
  left: number;
  maxHeight: number;
};

type Indicator = {
  x: number;
  width: number;
  visible: boolean;
};

const HIDDEN_INDICATOR: Indicator = { x: 0, width: 0, visible: false };

const WEAPON_SECTIONS = [
  "pistols",
  "mid_tier",
  "rifles",
  "knives",
  "gloves",
] as const;

type WeaponSection = (typeof WEAPON_SECTIONS)[number];

function isWeaponSection(section: NavSection): section is WeaponSection {
  return (WEAPON_SECTIONS as readonly string[]).includes(section);
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-3 w-3 shrink-0 transition-transform duration-200 ${
        open ? "rotate-180 opacity-100" : "opacity-60"
      }`}
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden
    >
      <path
        d="M3 4.5L6 7.5L9 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DropdownItem({
  active,
  onClick,
  children,
  inset = false,
}: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
  inset?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`block w-full truncate rounded-lg px-3 py-1.5 text-left text-sm transition ${
        inset ? "pl-5" : ""
      } ${
        active
          ? "bg-[var(--accent)]/15 text-[var(--accent)]"
          : "text-[var(--text-muted)] hover:bg-[var(--bg)]/70 hover:text-[var(--text)]"
      }`}
    >
      {children}
    </button>
  );
}

function MenuDivider() {
  return <div className="my-1 border-t border-[var(--border)]/70" />;
}

function useSupportsHover() {
  const [supportsHover, setSupportsHover] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setSupportsHover(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return supportsHover;
}

function NavDropdown({
  section,
  active,
  open,
  onOpen,
  onClose,
  registerRef,
  children,
}: {
  section: NavSection;
  active: boolean;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  registerRef: (section: NavSection, node: HTMLDivElement | null) => void;
  children: ReactNode;
}) {
  const supportsHover = useSupportsHover();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const closeTimerRef = useRef<number | null>(null);

  function clearCloseTimer() {
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function scheduleClose() {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      onClose();
      closeTimerRef.current = null;
    }, 120);
  }

  function keepOpen() {
    clearCloseTimer();
    onOpen();
  }

  useEffect(() => {
    return () => clearCloseTimer();
  }, []);

  useEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }

    function updatePosition() {
      const button = buttonRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const gutter = 8;
      const maxWidth = Math.min(288, window.innerWidth - gutter * 2);
      const left = Math.min(
        Math.max(gutter, rect.left),
        window.innerWidth - maxWidth - gutter,
      );
      const top = rect.bottom + 8;
      const maxHeight = Math.max(
        160,
        Math.min(window.innerHeight * 0.7, window.innerHeight - top - gutter),
      );
      setMenuPos({ top, left, maxHeight });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      onClose();
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    // Defer so the opening tap itself does not immediately close the menu.
    const timer = window.setTimeout(() => {
      document.addEventListener("pointerdown", onPointerDown);
    }, 0);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  const menu =
    mounted && open && menuPos
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="fixed z-[100] min-w-[13rem] overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--bg-panel)]/92 p-1.5 shadow-[0_18px_50px_-18px_rgba(0,0,0,0.8)] backdrop-blur-xl"
            style={{
              top: menuPos.top,
              left: menuPos.left,
              maxHeight: menuPos.maxHeight,
              maxWidth: "min(18rem, calc(100vw - 1rem))",
            }}
            onMouseEnter={supportsHover ? keepOpen : undefined}
            onMouseLeave={supportsHover ? scheduleClose : undefined}
          >
            {children}
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      ref={(node) => {
        rootRef.current = node;
        registerRef(section, node);
      }}
      className="group relative shrink-0"
      onMouseEnter={supportsHover ? keepOpen : undefined}
      onMouseLeave={supportsHover ? scheduleClose : undefined}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => (open ? onClose() : onOpen())}
        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 ${
          active
            ? "text-[var(--text)]"
            : "text-[var(--text-muted)] group-hover:text-[var(--text)]"
        }`}
      >
        {NAV_SECTION_LABELS[section]}
        <Chevron open={open} />
      </button>
      {menu}
    </div>
  );
}

export function CatalogNavRail({
  filter,
  items,
  collections,
  onApplyFilter,
  onNavigateCollection,
}: CatalogNavRailProps) {
  const [openSection, setOpenSection] = useState<NavSection | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef(new Map<string, HTMLDivElement>());
  const [indicator, setIndicator] = useState<Indicator>(HIDDEN_INDICATOR);

  const cases = useMemo(() => weaponCases(items), [items]);
  const sortedCollections = useMemo(
    () =>
      collections
        .filter((c) => c.isSkinCollection)
        .sort((a, b) =>
          a.name.localeCompare(b.name, "en", { sensitivity: "base" }),
        ),
    [collections],
  );

  const registerRef = useCallback(
    (section: NavSection, node: HTMLDivElement | null) => {
      if (node) sectionRefs.current.set(section, node);
      else sectionRefs.current.delete(section);
    },
    [],
  );

  const measure = useCallback(() => {
    const track = trackRef.current;
    const el = sectionRefs.current.get(filter.section);
    if (!track || !el) {
      setIndicator(HIDDEN_INDICATOR);
      return;
    }
    const trackBox = track.getBoundingClientRect();
    const itemBox = el.getBoundingClientRect();
    setIndicator({
      x: itemBox.left - trackBox.left + track.scrollLeft,
      width: itemBox.width,
      visible: true,
    });
  }, [filter.section]);

  useLayoutEffect(() => {
    measure();
    const track = trackRef.current;
    if (!track || typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(() => measure());
    observer.observe(track);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  function apply(next: NavFilter) {
    setOpenSection(null);
    onApplyFilter(next);
  }

  function renderWeaponMenu(section: WeaponSection) {
    const weapons = uniqueWeaponsForSection(items, section);
    const activeWeapon = filter.section === section ? filter.weapon : undefined;
    return (
      <>
        <DropdownItem
          active={filter.section === section && filter.weapon === null}
          onClick={() => apply({ section, weapon: null })}
        >
          All {NAV_SECTION_LABELS[section]}
        </DropdownItem>
        {weapons.length > 0 ? <MenuDivider /> : null}
        {weapons.map((weapon) => (
          <DropdownItem
            key={weapon}
            active={activeWeapon === weapon}
            onClick={() => apply({ section, weapon })}
          >
            {weapon}
          </DropdownItem>
        ))}
      </>
    );
  }

  return (
    <nav
      className="hud-panel relative z-30 overflow-hidden"
      aria-label="Catalog categories"
    >
      <div className="overflow-x-auto overscroll-x-contain">
        <div
          ref={trackRef}
          className="relative flex min-w-max items-stretch gap-0.5 px-1.5 py-1.5"
        >
          <span
            aria-hidden
            className="nav-indicator pointer-events-none absolute top-1.5 bottom-1.5 rounded-lg bg-[var(--accent)]/12 ring-1 ring-inset ring-[var(--accent)]/40"
            style={{
              width: indicator.width,
              opacity: indicator.visible ? 1 : 0,
              transform: `translateX(${indicator.x}px)`,
            }}
          />

          {NAV_SECTION_ORDER.map((section) => (
            <NavDropdown
              key={section}
              section={section}
              active={filter.section === section}
              open={openSection === section}
              onOpen={() => setOpenSection(section)}
              onClose={() =>
                setOpenSection((cur) => (cur === section ? null : cur))
              }
              registerRef={registerRef}
            >
              {isWeaponSection(section) ? renderWeaponMenu(section) : null}

              {section === "cases" ? (
                <>
                  <DropdownItem
                    active={filter.section === "cases" && filter.crateId === null}
                    onClick={() => apply({ section: "cases", crateId: null })}
                  >
                    All Cases
                  </DropdownItem>
                  {cases.length > 0 ? <MenuDivider /> : null}
                  {cases.map((c) => (
                    <DropdownItem
                      key={c.id}
                      active={
                        filter.section === "cases" && filter.crateId === c.id
                      }
                      onClick={() => apply({ section: "cases", crateId: c.id })}
                    >
                      {c.name}
                    </DropdownItem>
                  ))}
                </>
              ) : null}

              {section === "collections" ? (
                <>
                  <DropdownItem
                    active={filter.section === "collections"}
                    onClick={() => apply({ section: "collections" })}
                  >
                    All Collections
                  </DropdownItem>
                  {sortedCollections.length > 0 ? <MenuDivider /> : null}
                  {sortedCollections.map((c) => (
                    <DropdownItem
                      key={c.id}
                      active={false}
                      onClick={() => {
                        setOpenSection(null);
                        onNavigateCollection(c.id);
                      }}
                    >
                      {c.name}
                    </DropdownItem>
                  ))}
                </>
              ) : null}

              {section === "stickers" ? (
                <>
                  <DropdownItem
                    active={
                      filter.section === "stickers" &&
                      filter.sticker === "explore"
                    }
                    onClick={() =>
                      apply({ section: "stickers", sticker: "explore" })
                    }
                  >
                    Explore Stickers
                  </DropdownItem>
                  <DropdownItem
                    active={
                      filter.section === "stickers" && filter.sticker === "all"
                    }
                    onClick={() =>
                      apply({ section: "stickers", sticker: "all" })
                    }
                  >
                    All Stickers
                  </DropdownItem>
                  <DropdownItem
                    active={
                      filter.section === "stickers" &&
                      filter.sticker === "sticker_capsules"
                    }
                    onClick={() =>
                      apply({
                        section: "stickers",
                        sticker: "sticker_capsules",
                      })
                    }
                  >
                    All Sticker Capsules
                  </DropdownItem>
                  <DropdownItem
                    active={
                      filter.section === "stickers" &&
                      filter.sticker === "autograph_capsules"
                    }
                    onClick={() =>
                      apply({
                        section: "stickers",
                        sticker: "autograph_capsules",
                      })
                    }
                  >
                    All Autograph Capsules
                  </DropdownItem>
                  <p className="type-overline px-3 pb-1 pt-2">
                    Tournament Stickers
                  </p>
                  {STICKER_TOURNAMENTS.map((t) => (
                    <DropdownItem
                      key={t.label}
                      inset
                      active={
                        filter.section === "stickers" &&
                        typeof filter.sticker === "object" &&
                        filter.sticker.tournament === t.label
                      }
                      onClick={() =>
                        apply({
                          section: "stickers",
                          sticker: { tournament: t.label },
                        })
                      }
                    >
                      {t.label}
                    </DropdownItem>
                  ))}
                </>
              ) : null}

              {section === "other"
                ? OTHER_NAV_ITEMS.map((o) => (
                    <DropdownItem
                      key={o.key}
                      active={
                        filter.section === "other" && filter.other === o.key
                      }
                      onClick={() => apply({ section: "other", other: o.key })}
                    >
                      {o.label}
                    </DropdownItem>
                  ))
                : null}
            </NavDropdown>
          ))}
        </div>
      </div>
    </nav>
  );
}
