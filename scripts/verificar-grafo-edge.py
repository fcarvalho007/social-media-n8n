#!/usr/bin/env python3
"""Walk the import graph of every edge function (static AND dynamic imports with literal specifiers)
and fail on: unresolved relative imports, client aliases (@/...), paths escaping supabase/functions,
and React/TanStack/client-only modules reachable from a function entrypoint."""
import re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FUN = ROOT / "supabase" / "functions"
SPEC = re.compile(r"""(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)["']([^"']+)["']""")
PROIBIDOS = ("react", "react-dom", "@tanstack/", "lucide-react", "sonner", "zustand")

erros: list[str] = []
vistos: set[Path] = set()

def resolver(base: Path, spec: str) -> Path | None:
    alvo = (base.parent / spec).resolve()
    for c in (alvo, alvo.with_suffix(".ts"), alvo.with_suffix(".tsx"), alvo / "index.ts"):
        if c.is_file():
            return c
    return None

def visitar(f: Path, origem: str) -> None:
    if f in vistos:
        return
    vistos.add(f)
    texto = re.sub(r"^\s*//.*$", "", f.read_text(encoding="utf-8"), flags=re.M)
    for spec in SPEC.findall(texto):
        rel = f.relative_to(ROOT)
        if spec.startswith("@/"):
            erros.append(f"{rel}: alias de cliente '{spec}' ({origem})")
        elif spec.startswith("."):
            r = resolver(f, spec)
            if r is None:
                erros.append(f"{rel}: import inexistente '{spec}' ({origem})")
            elif FUN not in r.parents:
                erros.append(f"{rel}: sai de supabase/functions '{spec}' ({origem})")
            else:
                visitar(r, origem)
        elif spec.startswith("npm:") or spec.startswith("jsr:") or spec.startswith("https:") or spec.startswith("node:"):
            nome = spec.split(":", 1)[1]
            if nome.startswith(PROIBIDOS):
                erros.append(f"{rel}: módulo de cliente '{spec}' ({origem})")
        elif spec.startswith(PROIBIDOS):
            erros.append(f"{rel}: módulo de cliente '{spec}' ({origem})")

for entrada in sorted(FUN.glob("*/index.ts")):
    visitar(entrada.resolve(), entrada.parent.name)

print(f"{len(vistos)} ficheiros alcançáveis verificados")
for e in sorted(set(erros)):
    print("ERRO", e)
sys.exit(1 if erros else 0)
