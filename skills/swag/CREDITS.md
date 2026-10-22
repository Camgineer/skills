# Credits

Swag's shared principles and surface guidance are original work under the [Apache-2.0 license](LICENSE). It references installed companions by name and bundles none of their instruction text, scripts, or reference files. The web sample follows animate's motion guidance and uses its specified easing value; the page implementation is original work.

| Skill | Author | Source | License and reuse |
|---|---|---|---|
| frontend-design | Anthropic | [Official skill](https://github.com/anthropics/skills/tree/main/skills/frontend-design) | [Apache-2.0](https://github.com/anthropics/skills/blob/main/skills/frontend-design/LICENSE.txt). Allows copying and adaptation subject to its notice and license terms. Swag copies no instruction text. |
| impeccable | Paul Bakaus | [Official repository](https://github.com/pbakaus/impeccable) | [Apache-2.0](https://github.com/pbakaus/impeccable/blob/main/LICENSE). Allows copying and adaptation subject to its notice and license terms. Swag copies no instruction text. |
| animate | Emil Kowalski | [Official skill](https://github.com/emilkowalski/skills/tree/main/skills/animate) | [MIT](https://github.com/emilkowalski/skills/blob/main/LICENSE). Allows copying and adaptation with the copyright and permission notice. Swag copies no instruction text. |
| web-design-guidelines | Vercel | [Official skill](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines) | Missing or unclear for the skill itself. Neither the inspected upstream skill folder nor the repository root declares a license. Swag references it by name and copies no instruction text. |
| dataviz, optional | Depends on the host-provided distribution; unverified without a selected copy | No canonical package is selected by swag. Read the author and source metadata of the actual installed skill. | License is unverified until that copy's terms are inspected. The name alone does not identify an author, source URL, or license. Swag bundles no dataviz material and makes no redistribution claim. |

The four web companions are required only by the web route. Dataviz is an optional host-provided skill name. Different packages can share that name, so swag does not attribute an arbitrary public package or install one automatically. Its chart route requires preserving the selected copy's author, canonical source, and license information when crediting that work. If those are absent or unclear, report that limit and copy none of its material.

The web-design-guidelines skill fetches a separate resource, [Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines), by Vercel Labs. That resource has an [MIT license](https://github.com/vercel-labs/web-interface-guidelines/blob/main/LICENSE). Its license is distinct from the skill's missing license. Swag does not bundle that resource.

The web companions' upstream licensing and provenance were checked on October 22, 2026. Dataviz provenance depends on the host-provided copy, as noted above.
