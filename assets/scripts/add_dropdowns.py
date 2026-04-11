import re

file_path = "c:\\Users\\XENJI\\Desktop\\APEXFITNESS\\APEX\\pages\\ejercicios.html"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update grafica-top
grafica_target = """<button class="btn-metrica" data-metrica="volumen" aria-pressed="false">Volumen</button>
                  </div>"""

dropdown_grafica = """<button class="btn-metrica" data-metrica="volumen" aria-pressed="false">Volumen</button>
                  </div>
                  <div class="dropdown-wrap" style="margin-left: 8px;">
                    <button class="btn-opciones" aria-label="Opciones de gráfica" aria-haspopup="true" aria-expanded="false">
                      <i data-lucide="more-vertical"></i>
                    </button>
                    <div class="dropdown-menu oculto" role="menu">
                      <button class="dropdown-item" role="menuitem"><i data-lucide="line-chart"></i> Puntos de la Gráfica</button>
                      <button class="dropdown-item" role="menuitem"><i data-lucide="trending-up"></i> Línea de Tendencia</button>
                      <button class="dropdown-item" role="menuitem"><i data-lucide="crosshair"></i> Eje Y desde 0</button>
                      <div class="dropdown-separator" role="separator"></div>
                      <button class="dropdown-item" role="menuitem"><i data-lucide="calendar"></i> Fecha Personalizada</button>
                      <button class="dropdown-item" role="menuitem"><i data-lucide="calculator"></i> Calculadoras</button>
                    </div>
                  </div>"""

content = content.replace(grafica_target, dropdown_grafica)

# 2. Update item-biblioteca to add three dots and ensure relative positioning
pattern = r'(<li class="item-biblioteca".*?>)(.*?)(</li>)'

dropdown_item = """
              <div class="dropdown-wrap" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%);">
                <button class="btn-opciones" aria-label="Opciones de ejercicio" aria-haspopup="true" aria-expanded="false" onclick="event.stopPropagation();">
                  <i data-lucide="more-horizontal"></i>
                </button>
                <div class="dropdown-menu oculto" role="menu">
                  <button class="dropdown-item" role="menuitem"><i data-lucide="edit-2"></i> Editar</button>
                  <button class="dropdown-item" role="menuitem" style="color: #ff5252;"><i data-lucide="trash-2" style="color: #ff5252;"></i> Eliminar</button>
                </div>
              </div>
            </li>"""

def replacer(match):
    li_open = match.group(1)
    if 'style=' not in li_open:
        li_open = li_open.replace('class="item-biblioteca"', 'class="item-biblioteca" style="position: relative;"')
    return li_open + match.group(2) + dropdown_item

content = re.sub(pattern, replacer, content, flags=re.DOTALL)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Dropdowns added to ejercicios.html successfully.")
