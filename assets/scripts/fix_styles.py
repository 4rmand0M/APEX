import re

file_path = "c:\\Users\\XENJI\\Desktop\\APEXFITNESS\\APEX\\assets\\css\\workout.css"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix the merged styles
bad_block = '''
.btn-fecha-selector {
  background: transparent;
  border: none;
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: var(--texto);
  letter-spacing: 1.5px;
  text-transform: uppercase;
  background: none;
  border: none;
  color: var(--acento);
  cursor: none;
  display: flex;
  align-items: center;
  padding: 6px;
  border-radius: 8px;
  transition: background .14s, transform .14s;
}

.btn-fecha-nav i {
  width: 22px;
  height: 22px;
  stroke-width: 2.5;
}

.btn-fecha-nav:hover {
  background: var(--superficie-2);
  transform: scale(1.1);
}

[data-tema="claro"] .btn-fecha-nav {
  color: var(--texto);
}
'''

good_block = '''
.btn-fecha-selector {
  background: transparent;
  border: none;
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: var(--texto);
  letter-spacing: 1.5px;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 8px;
  transition: background 0.14s ease;
}

.btn-fecha-selector:hover {
  background: var(--superficie-2);
}

.btn-fecha-selector i {
  width: 16px;
  height: 16px;
  color: var(--acento);
}

/* FLOATING SCROLL BUTTONS */
.floating-scroll-btns {
  position: fixed;
  bottom: 100px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 99;
}

@media (min-width: 821px) {
  .floating-scroll-btns {
    bottom: 40px;
    right: 40px;
  }
}

.fab-scroll {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(30, 30, 30, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid var(--borde);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
  color: var(--texto);
}

.fab-scroll:hover {
  background: var(--superficie-2);
  transform: scale(1.05);
}

.fab-scroll i {
  width: 24px;
  height: 24px;
}
'''

content = content.replace(bad_block.strip(), good_block.strip())

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("workout.css fixed")
