import './style.css'
import { renderPublicView } from './components/publicView'
import { renderChefView } from './components/chefView'

const currentPath = window.location.pathname.replace(/\/+$/, '') || '/'

if (currentPath === '/cocina') {
  renderChefView()
} else {
  renderPublicView()
}
