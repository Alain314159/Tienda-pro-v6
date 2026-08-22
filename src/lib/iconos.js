import { h } from 'vue'
import {
  LayoutDashboard, ShoppingCart, Package, Tag, ClipboardList, Wallet,
  Landmark, FileText, Store, ShieldCheck, Settings, Sun, Moon,
  RefreshCw, LogOut, Menu, Plus, Minus, Trash2, Edit3, Search,
  Camera, Star, Eye, EyeOff, Download, Upload, Users, Key, Check
} from 'lucide-vue-next'

const make = (icon) => ({ size = 18, class: cls = '' }) =>
  h(icon, { size, class: cls, 'stroke-width': 1.8 })

export const I = {
  Dashboard: make(LayoutDashboard), Ventas: make(ShoppingCart),
  Compras: make(Package), Productos: make(Tag),
  Inventario: make(ClipboardList), Caja: make(Wallet),
  Patrimonio: make(Landmark), Reportes: make(FileText),
  Mayorista: make(Store), MultiTienda: make(Store),
  Auditoria: make(ShieldCheck), Ajustes: make(Settings),
  Sol: make(Sun), Luna: make(Moon), Sync: make(RefreshCw),
  Salir: make(LogOut), Menu: make(Menu), Mas: make(Plus),
  Menos: make(Minus), Basura: make(Trash2), Editar: make(Edit3),
  Buscar: make(Search), Camara: make(Camera), Estrella: make(Star),
  EstrellaL: make(Star), Ojo: make(Eye), OjoOff: make(EyeOff),
  Descargar: make(Download), Subir: make(Upload), Usuarios: make(Users),
  Llave: make(Key), Check: make(Check)
}
