#!/usr/bin/env bash
#
# Build a FileVault content package from the generated JCR XML.
# Maps migration-work/jcr-content/{rel}.xml -> jcr_root/content/kotak-bank/{rel}/.content.xml
#
# Includes the en/* pages plus the site-root nav and footer documents (so the
# header/footer fragment blocks resolve). The filter lists each top-level root
# individually and never includes /content/kotak-bank itself, so the site's
# sling:configRef config node is left untouched.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${REPO_ROOT}"

SRC="migration-work/jcr-content"
SITE_ROOT="content/kotak-bank"
BUILD="migration-work/pkg-build"
PACKAGE="${AEM_PACKAGE:-migration-work/kotak-content-kb.zip}"

rm -rf "${BUILD}"
mkdir -p "${BUILD}/jcr_root/${SITE_ROOT}" "${BUILD}/META-INF/vault"

# Copy every generated page xml into jcr_root as a .content.xml node.
count=0
while IFS= read -r xml; do
  rel="${xml#${SRC}/}"; rel="${rel%.xml}"
  dest="${BUILD}/jcr_root/${SITE_ROOT}/${rel}"
  mkdir -p "${dest}"
  cp "${xml}" "${dest}/.content.xml"
  count=$((count + 1))
done < <(find "${SRC}" -name '*.xml')
echo "Staged ${count} page nodes"

# filter.xml: en pages + nav + footer as separate roots (NOT the site root).
cat > "${BUILD}/META-INF/vault/filter.xml" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<workspaceFilter version="1.0">
  <filter root="/content/kotak-bank/en"/>
  <filter root="/content/kotak-bank/nav"/>
  <filter root="/content/kotak-bank/footer"/>
</workspaceFilter>
EOF

cat > "${BUILD}/META-INF/vault/properties.xml" <<'EOF'
<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE properties SYSTEM "http://java.sun.com/dtd/properties.dtd">
<properties>
  <comment>FileVault Package Definition</comment>
  <entry key="name">kotak-content-en</entry>
  <entry key="group">migration</entry>
  <entry key="version">1.0</entry>
  <entry key="createdBy">excat-migration</entry>
</properties>
EOF

rm -f "${PACKAGE}"
python3 - "${BUILD}" "${PACKAGE}" <<'PY'
import os, sys, zipfile
build, package = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(package, 'w', zipfile.ZIP_DEFLATED) as z:
    for root, _, files in os.walk(build):
        for f in files:
            full = os.path.join(root, f)
            arc = os.path.relpath(full, build)
            z.write(full, arc)
PY
echo "✅ Built ${PACKAGE}"
unzip -l "${PACKAGE}" | grep -iE "filter.xml|/nav/.content|/footer/.content|/en/home/.content" || true
