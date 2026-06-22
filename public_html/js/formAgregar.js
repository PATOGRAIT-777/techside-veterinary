(function(){
  // CORRECCIÓN AQUÍ: Cambiamos 'mx-divisions' por 'mxDivisions' (tal cual se llama tu archivo en routes/)
  const BASE_API_URL = 'http://localhost:3000/api/mxDivisions';

  // DOM elements
  const stateSelect = document.getElementById('mx_state');
  const municipioSelect = document.getElementById('mx_municipio');
  const coloniaSelect = document.getElementById('mx_colonia');
  const cpInput = document.querySelector('input[name="cp"]');
  const yearEl = document.getElementById('year');

  if(yearEl) yearEl.textContent = new Date().getFullYear();

  // Helpers globales para validaciones
  window.regValNum = function(event) {
    const numeros = "1234567890";
    const tecla = String.fromCharCode(event.which || event.keyCode);
    if (numeros.indexOf(tecla) === -1) { alert("Por favor, ingresa solo números"); return false; }
    return true;
  };

  window.regValText = function(event) {
    const letras = "abcdefghijklmnñopqrstuvwxyzABCDEFGHIJKLMNÑOPQRSTUVWXYZ ";
    const tecla = String.fromCharCode(event.which || event.keyCode);
    if (letras.indexOf(tecla) === -1) { alert("Por favor, ingresa solo texto"); return false; }
    return true;
  };

  // --- API FETCH FUNCTIONS ---
  async function fetchStates() {
    try {
      if(!stateSelect) return;
      stateSelect.disabled = true;
      stateSelect.innerHTML = '<option value="">Cargando estados...</option>';
      
      const response = await fetch(`${BASE_API_URL}/states`);
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const states = await response.json();
      
      stateSelect.innerHTML = '<option value="">-- Selecciona estado --</option>';
      states.sort((a,b)=>a.localeCompare(b,'es')).forEach(state => {
        const opt = document.createElement('option');
        opt.value = state;
        opt.textContent = state;
        stateSelect.appendChild(opt);
      });
      stateSelect.disabled = false;
    } catch (error) {
      console.error('Error fetching states:', error);
      if(stateSelect) {
         stateSelect.innerHTML = '<option value="">-- Error al cargar --</option>';
         stateSelect.disabled = false;
      }
    }
  }

  async function fetchMunicipalities(state) {
    try {
      municipioSelect.disabled = true;
      municipioSelect.innerHTML = '<option value="">Cargando municipios...</option>';
      
      const response = await fetch(`${BASE_API_URL}/municipalities/${encodeURIComponent(state)}`);
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const municipalities = await response.json();
      
      municipioSelect.innerHTML = '<option value="">-- Selecciona municipio --</option>';
      coloniaSelect.innerHTML = '<option value="">-- Selecciona colonia --</option>';
      cpInput.value = '';
      
      municipalities.sort((a,b)=>a.localeCompare(b,'es')).forEach(m => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m;
        municipioSelect.appendChild(opt);
      });
      municipioSelect.disabled = false;
      coloniaSelect.disabled = true;
    } catch (error) {
      console.error('Error fetching municipalities:', error);
      municipioSelect.innerHTML = '<option value="">-- Error --</option>';
      municipioSelect.disabled = false;
    }
  }

  async function fetchColonias(state, municipio) {
    try {
      coloniaSelect.disabled = true;
      coloniaSelect.innerHTML = '<option value="">Cargando colonias...</option>';
      
      const response = await fetch(`${BASE_API_URL}/colonias/${encodeURIComponent(state)}/${encodeURIComponent(municipio)}`);
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const colonias = await response.json(); 
      
      coloniaSelect.innerHTML = '<option value="">-- Selecciona colonia --</option>';
      cpInput.value = '';
      
      colonias.sort((x,y)=> (x.colonia||'').localeCompare(y.colonia||'','es')).forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.colonia;
        opt.textContent = c.colonia;
        opt.dataset.cp = c.codigo_postal;
        coloniaSelect.appendChild(opt);
      });
      coloniaSelect.disabled = false;
    } catch (error) {
      console.error('Error fetching colonias:', error);
      coloniaSelect.innerHTML = '<option value="">-- Error --</option>';
      coloniaSelect.disabled = false;
    }
  }

  // Listeners
  if(stateSelect) stateSelect.addEventListener('change', () => {
    const selectedState = stateSelect.value;
    if (selectedState) fetchMunicipalities(selectedState);
  });

  if(municipioSelect) municipioSelect.addEventListener('change', () => {
    const selectedState = stateSelect.value;
    const selectedMunicipio = municipioSelect.value;
    if (selectedState && selectedMunicipio) fetchColonias(selectedState, selectedMunicipio);
  });

  if(coloniaSelect) coloniaSelect.addEventListener('change', () => {
    const selectedColoniaOption = coloniaSelect.options[coloniaSelect.selectedIndex];
    if (selectedColoniaOption && selectedColoniaOption.dataset.cp) cpInput.value = selectedColoniaOption.dataset.cp;
  });

  // Carga inicial
  fetchStates();

})();