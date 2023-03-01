import {title, table as htmlTable, filtersHtml, filterHtml} from "./views.js";
import { filters, defFiltrado } from "./config.js";
import { ChangeElementContenWhileLoading } from "../utils/functions.js";

const {novedad, proceso, pedido, pagada, finalizada, generada} = defFiltrado;

const container = $("#historial_guias");
const buscador = $("#filtrado-guias_hist")

buscador.before(filtersHtml);
container.append(htmlTable);

const typesGenerales = [novedad, proceso, pedido, pagada, finalizada, generada];

const columns = [
    {data: null, title: "Acciones", render: accionesDeFila, types: typesGenerales},
    // {data: null, title: "Empaque", render: accionEmpaque, types: [generada]},
    {data: null, title: "Gestionar", render: accionGestNovedad, types: [novedad]},
    {data: "id_heka", title: "Id", defaultContent: "", types: typesGenerales},
    {data: "numeroGuia", title: "# Guía", defaultContent: "", types: [novedad, proceso, pagada, finalizada, generada]},
    {data: "estado", title: "Estado", defaultContent: "", types: [novedad, proceso, pagada, finalizada]},
    {data: "transportadora", 
    orderable: false,
    title: "Transportadora", defaultContent: "", types: typesGenerales},
    {data: "type", title: "Tipo", 
    orderable: false,
    defaultContent: "", types: typesGenerales},
    {data: "nombreD", title: "Destinatario", defaultContent: "", types: typesGenerales},
    {
        data: "telefonoD", title: "Telefonos",
        defaultContent: "", render: (valor,type,row) => {
            if(type === "display" || type === "filter") {
                const aCelular1 = `<a class="btn btn-light d-flex align-items-baseline mb-1 action" href="https://api.whatsapp.com/send?phone=57${valor.toString().replace(/\s/g, "")}" target="_blank"><i class="fab fa-whatsapp mr-1" style="color: #25D366"></i>${valor}</a>`;
                const aCelular2 = `<a class="btn btn-light d-flex align-items-baseline action" href="https://api.whatsapp.com/send?phone=57${row["celularD"].toString().replace(/\s/g, "")}" target="_blank"><i class="fab fa-whatsapp mr-1" style="color: #25D366"></i>${row["celularD"]}</a>`;
                return aCelular1;
            }

            return valor;
        }, 
        types: typesGenerales
    },
    {data: "ciudadD", title: "Ciudad", defaultContent: "", types: typesGenerales},
    {data: "fecha", title: "Fecha", defaultContent: "", types: typesGenerales},
    {
        data: "seguro", title: "Seguro", 
        defaultContent: "", render: (value, type, row) => {
            if(type === "display" || type === "filter") {
                return value || row["valor"];
            }

            return value;
        },
        types: typesGenerales
    },
    {
        data: "valor", title: "Recaudo", 
        defaultContent: "",
        types: typesGenerales
    },
    {
        data: "costo_envio", title: "Costo de envío", 
        defaultContent: "",
        types: typesGenerales
    },
    {
        data: "detalles.comision_punto", title: "Ganancia", 
        defaultContent: "No aplica", visible: ControlUsuario.esPuntoEnvio,
        types: typesGenerales
    },
    {
        data: "referencia", title: "Referencia", 
        defaultContent: "No aplica",
        types: typesGenerales
    }
]

const table = $("#tabla-historial-guias").DataTable({
    destroy: true,
    data: null,
    rowId: "row_id",
    order: [[3, "desc"]],
    columns,
    language: {
      url: "https://cdn.datatables.net/plug-ins/1.10.24/i18n/Spanish.json"
    },
    dom: 'Bfrtip',
    buttons: [],
    scrollY: '60vh',
    scrollX: true,
    scrollCollapse: true,
    paging: false,
    initComplete: agregarFuncionalidadesTablaPedidos,
    drawCallback: renderizadoDeTablaHistorialGuias
});

globalThis.filtrador = new Watcher(pedido);

export default class SetHistorial {
    constructor() {
        this.guias = [];
        this.filtradas = [];
        this._filtrador = pedido;
        this.renderTable = true;
    }

    get filtrador() {
        return this._filtrador
    }

    set filtrador(filt) {
        this._filtrador = filt;
        filtrador.change(filt);
    }

    add(guia) {
        const filtro = defineFilter(guia) === this.filtrador;
        const gIdx = this.guias.findIndex(g => g.id_heka === guia.id_heka);
        const lIdx = this.filtradas.findIndex(g => g.id_heka === guia.id_heka);

        if (filtro) {
            if(lIdx === -1) {
                this.filtradas.push(guia);
                table.row.add(guia)
                this.renderTable = true;
            } else {
                const row = table.row(lIdx);
                this.filtradas[lIdx] = guia;
                row.data(guia);
                this.renderTable = false;
            }
        } else if(!filtro && lIdx !== -1) {
            const row = table.row(lIdx);
            table.row(lIdx).remove();
            this.filtradas.splice(lIdx, 1);
            this.renderTable = true;
        }

        if(gIdx === -1) {
            this.guias.push(guia);
        } else {
            this.guias[gIdx] = guia;
        }
    }

    delete(id_heka) {
        const index = this.guias.findIndex(g => g.id_heka === id_heka);

        if(index !== -1) {
            this.guias.splice(index,1);
            this.renderTable = true;
        };
    }

    //Según el tipo de filtrado muestra los botones necesarios
    defineButtons(filt) {
        table.buttons().remove();
        let indexBtn = 0;

        if(filt === pedido) {
            table.button().add(indexBtn, {
                action: aceptarPedido,
                className: "btn-success",
                text: "Acceptar pedido <i class='fa fa-arrow-right ml-2'></i>",
            });
            indexBtn++;
        } 

        if([proceso, finalizada, generada].includes(filt)) {
            table.button().add(indexBtn, {
                action: descargarGuiasParticulares,
                text: "Descargar Pdf"
            });
            indexBtn++;
        }

        if (filt === generada){
            table.button().add(indexBtn, {
                action: crearDocumentos,
                className: "btn-success",
                text: "Procesar <i class='fa fa-arrow-right ml-2'></i>"
            });
            indexBtn++;
        }

        if([proceso, finalizada, pagada].includes(filt)) {
            table.button().add(indexBtn, {
                extend: "excel",
                text: "Descargar excel",
                filename: "Historial Guías",
                exportOptions: {
                  columns: [1,2,3,4,5,6,7,9,10,11,12,13]
                }
            });
            indexBtn++;
        }
        
    }

    defineColumns() {
        // No está funcionando como debería (error desconocido)
        
        let columnas = columns.map((c,i) =>  c.types.includes(this.filtrador) && c.visible !== false ? i : false)
        .filter(f => f !== false);

        const renderizar = () => {
            table.columns().every(nCol => {
                const col = table.column(nCol);
                
                const ver = columnas.includes(nCol);
                const visibilidadPrev = col.visible();
                
                if(visibilidadPrev != ver) {
                    col.visible(ver);
                }
            });
        }

        try {
            renderizar();
        } catch {
            setTimeout(() => {
               renderizar(); 
            }, 500)
            
        } 
    
    }

    filter(filt) {
        this.filtrador = filt;
        this.filtradas = this.guias.filter(g => defineFilter(g) === filt);
        this.render(true);

        return this.filtradas;
    }

    render(clear) {
        this.counterFilter();
        if(!this.renderTable && !clear) return;
        
        this.defineButtons(this.filtrador);
        if(clear) {
            table.clear()

            this.filtradas.forEach(guia => {
                table.row.add(guia);
            });

            this.defineColumns();
        }
        table.draw();

        this.renderTable = false;
    }

    counterFilter() {
        if(!this.nodeFilters) return;
        this.nodeFilters.each((i,node) => {
            const filt = node.getAttribute("data-filter");
            const cant = this.guias.filter(g => defineFilter(g) === filt).length;
            $(node).find(".counter").text(cant);
        })
    }

    includeFilters() {
        const container = $("#filtros-historial-guias");
    
        filters.forEach((filt, i) => {
            container.append(filterHtml(filt, i, filters.length));
        });
    
        const nodeFilters = container.children(".filtro");
        nodeFilters.css({width: 100 / nodeFilters.length + "%"});
        nodeFilters.filter((i, node) => node.getAttribute("data-filter") === this.filtrador)
        .addClass("active")

        const filtrar = this.filter.bind(this);
        
        nodeFilters.click(function() {
            nodeFilters.removeClass("active");
            this.classList.add("active");
            filtrar(this.getAttribute("data-filter"));
        });

        this.nodeFilters = nodeFilters;

        return filters;
    }

    clean(avoid) {
        const respaldo = this.guias.filter(g => defineFilter(g) === avoid);
        this.filtradas = [];
        this.guias = respaldo;

        this.render(true);
    }
}

//Devuelve un string con el tipo de filtrado según la guía
function defineFilter(data) {
    const estGeneradas = ["Envío Admitido", "RECIBIDO DEL CLIENTE", "Enviado", "", undefined];
    const estAnuladas = ["Documento Anulado", "Anulada"];

    let filter;

    if (data.enNovedad) {
        filter = novedad;
    } else if (data.staging) {
        filter = pedido;
    } else if(!data.debe && data.type !== "CONVENCIONAL") {
        filter = pagada
    } else if (data.seguimiento_finalizado) {
        filter = finalizada;
    } else if(data.estadoActual === generada) {
        filter = generada;
    } else {
        filter = proceso;
    }

    return filter;
}

function getContadorGuiasSeleccionadas() {
    const inpSelectGuias = $("#select-all-guias");
    const contenedorSelector = inpSelectGuias.parent();
    const textoSelector = contenedorSelector.find(".texto");
    const counterSelector = contenedorSelector.find(".counter");
    return {
        inpSelectGuias,
        contenedorSelector,
        textoSelector,
        counterSelector
    }
}

function agregarFuncionalidadesTablaPedidos() {
    const api = this.api();
    this.parent().parent().before(`
        <div class="form-group form-check">
            <input type="checkbox" class="form-check-input" id="select-all-guias">
            <label class="form-check-label" for="select-all-guias"><span class='texto'>Seleccionar Todas </span><span class="counter"></span></label>
        </div>
    `);

    const {
        inpSelectGuias,
        counterSelector
    } = getContadorGuiasSeleccionadas();

    const findIndex = data => columns.findIndex(d => d.data === data);
    const colTransp = findIndex("transportadora");
    const colType = findIndex("type");

    filtrador.watch(filt => {
        setTimeout(() => {
            renderContador(filt, api.data());
            filtrarHistorialGuiasPorColumna(api.column(colTransp))
            filtrarHistorialGuiasPorColumna(api.column(colType))
        }, 300);
    })

    inpSelectGuias.change(async (e) => {
        const checked = e.target.checked;
        // if(filtrador.value === generada) {
        //     const cant = await empacarMasivo(api.data(), checked);
        //     counterSelector.text(cant ? "("+cant+")" : "");
        //     return
        // } 

        if(checked) {
            let counter = 0;
            const limit = 50;
            const row = $("tr:gt(0)", this).each((i,row) => {
                const data = api.row(row).data();
                if(counter < limit) {
                    $(row).addClass("selected bg-gray-300");
                    counter ++;
                }
            })
        } else {
            $("tr:gt(0)", this).removeClass("selected bg-gray-300");
        }

        const cant = $("tr.selected", this).length;
        counterSelector.text(cant ? "("+cant+")" : "");
    });


    // if (this[0].getAttribute("data-table_initialized")) {
    //     return;
    // } else {
    //     this[0].setAttribute("data-table_initialized", true);
    // }

    $('tbody', this).on( 'click', 'tr', function (e) {
        console.log(!e.target.classList.contains("action"), e.target.tagName !== "I")
        if([novedad].includes(filtrador.value)) return;
        if(!e.target.classList.contains("action") && e.target.tagName !== "I")
        $(this).toggleClass('selected bg-gray-300');
        renderContador(filtrador.value, api.data());
    });

        
}

function renderizadoDeTablaHistorialGuias(config) {
    console.count("renderizando tabla");
    const api = this.api();
    const data = this.api().data();

    data.each((data, i) => {
        const row = api.row(i).node();
        const buttonsActivated = row.getAttribute("data-active");
        
        if(!buttonsActivated) {
            // $(".action", row).tooltip();
            activarBotonesDeGuias(data.id_heka, data, true);
        }

        row.setAttribute("data-active", true);
    });

    return;

    api.column(0).nodes().to$().each((i, el) => {
        const buttonsToHide = $(el).children().children("button:gt(1)");
        const verMas = $(el).children().children("a:not(.activated)");

        verMas.click(() => {
            if(buttonsToHide.css("display") === "none") {
                buttonsToHide.show();
                verMas.text("Ver menos");
            } else {
                buttonsToHide.hide();
                verMas.text("Ver más");
            }
        });
        buttonsToHide.css("display", "none");
        verMas.text("Ver más");
        verMas.addClass("activated");
    });

}

function renderContador(filt, data) {
    const llenarContador = cant => counterSelector.text(cant ? " ("+cant+")" : "");
    const empacadas = () => data.filter(g => g.empacada);

    const {
        inpSelectGuias,
        contenedorSelector,
        textoSelector,
        counterSelector
    } = getContadorGuiasSeleccionadas();

    contenedorSelector.removeClass("d-none");

    // if(filt === generada) {
    //     const cantidadEmpacadas = empacadas().length;
    //     const textoDevuelto = cantidadEmpacadas > 0
    //         ? "Empacar todas - cantidad empacadas" 
    //         : "Empacar todas";

    //     if(cantidadEmpacadas >= 50 || cantidadEmpacadas === data.length) inpSelectGuias.prop("checked", true);
    //     textoSelector.text(textoDevuelto);
    //     llenarContador(empacadas().length);
    // }
    if ([pedido, proceso, finalizada, pagada, generada].includes(filt)) {
        inpSelectGuias.prop("checked", false);
        textoSelector.text("Seleccionar todas");
        globalThis.d = data;
        const selectedRows = data.rows(".selected").data().length;
        
        llenarContador(selectedRows);
    } else {
        contenedorSelector.addClass("d-none");
    }
}

//Para cuando los pedidos están en staggin, permiter proceder con la creación de la guía
async function aceptarPedido(e, dt, node, config) {
    let api = dt;

    const loader = new ChangeElementContenWhileLoading(node);
    loader.init();

    // Cargador.fire("Creando guías", "Estamos generando las guías solicitadas, esto podría demorar unos minutos, por favor espere.")

    const selectedRows = api.rows(".selected");
    let datas = selectedRows.data();
    const nodos = selectedRows.nodes();

    if(!nodos.length) {
        loader.end();
        return;
    }
    // return;

    let errores = [];
    let i = 0;
    for await ( let guia of datas.toArray()) {
        const row = nodos[i];
        const respuesta = await crearGuiaTransportadora(guia);
        let icon, color;
        if(!respuesta.error) {
            icon = "clipboard-check";
            color = "text-success";
            row.classList.remove("selected", "bg-gray-300");
            await descontarSaldo(guia);
        } else {
            icon = "exclamation-circle";
            color = "text-danger";
            errores.push([row, respuesta.message, icon, color]);
        }
        i++;
    }
    
    errores.forEach(([row, mensaje, icon, colorText]) => {
        $(row).after(`<tr><td colspan='11' class='${colorText} action'><i class='fa fa-${icon} mr-2'></i>${mensaje}</td></tr>`)
    });

    if(!errores.length) $("#filter_listado-guias_hist").click(); 
    
    loader.end();

    Toast.fire({
        icon: "success",
        title: "¡Proceso terminado!"
    })
}

async function descontarSaldo(datos) {
    const datos_heka = datos_personalizados || await db.collection("usuarios").doc(localStorage.user_id)
    .get().then(doc => doc.data().datos_personalizados);

    //Estas líneas será utilizadas para cuando todos los nuevos usuarios por defecto
    //no tengan habilitadas las transportadoras, para que administración se las tenga que habilitar
    // if(!datos_heka) {
    //     return {
    //         mensaje: "Lo sentimos, no pudimos carga su información de pago, por favor intente nuevamente.",
    //         mensajeCorto: "No se pudo cargar su información de pago",
    //         icon: "error",
    //         title: "Sin procesar"
    //     }
    // }

    // FIN DEL BLOQUE

    const id = datos.id_heka;
    console.log(datos.debe);
    if(!datos.debe && !datos_personalizados.actv_credit &&
        datos.costo_envio > datos_personalizados.saldo && datos.type !== CONTRAENTREGA) {
        return {
            mensaje: `Lo sentimos, en este momento, el costo de envío excede el saldo
            que tienes actualmente, por lo tanto este metodo de envío no estará 
            permitido hasta que recargues tu saldo. Puedes comunicarte con la asesoría logística para conocer los pasos
            a seguir para recargar tu saldo.`,
            mensajeCorto: "El costo de envío excede el saldo que tienes actualmente",
            icon: "error",
            title: "¡No permitido!"
        }
    };

    let user_debe;
    datos_personalizados.saldo <= 0 ? user_debe = datos.costo_envio
    : user_debe = - datos_personalizados.saldo + datos.costo_envio;

    if(user_debe > 0 && !datos.debe) datos.user_debe = user_debe;

    if(!datos_heka) return id;

    let momento = new Date().getTime();
    let saldo = datos_heka.saldo;
    let saldo_detallado = {
        saldo: saldo,
        saldo_anterior: saldo,
        limit_credit: datos_heka.limit_credit || 0,
        actv_credit: datos_heka.actv_credit || false,
        fecha: genFecha(),
        diferencia: 0,
        mensaje: "Guía " + id + " creada exitósamente",
        momento: momento,
        user_id: localStorage.user_id,
        guia: id,
        numeroGuia: datos.numeroGuia || "",
        transportadora: datos.transportadora || "",
        medio: "Usuario: " + datos_usuario.nombre_completo + ", Id: " + localStorage.user_id,
        type: "DESCONTADO"
    };

    //***si se descuenta del saldo***
    if(!datos.debe && datos.type !== CONTRAENTREGA){
        saldo_detallado.saldo = saldo - datos.costo_envio;

        if(ControlUsuario.esPuntoEnvio) saldo_detallado.saldo += datos.detalles.comision_punto;

        saldo_detallado.diferencia = saldo_detallado.saldo - saldo_detallado.saldo_anterior;
        
        let factor_diferencial = parseInt(datos_heka.limit_credit) + parseInt(saldo);
        console.log(saldo_detallado);
        
        /* creo un factor diferencial que sume el limite de credito del usuario
        (si posee alguno) más el saldo actual para asegurarme que 
        este por encima de cero y por debajo del costo de envío, 
        en caso de que no se cumpla, se envía una notificación a administración del exceso de gastos*/
        if(factor_diferencial <= datos.costo_envio && factor_diferencial > 0) {
            notificarExcesoDeGasto();
        }
        await actualizarSaldo(saldo_detallado);
    }
    return id;
}

function accionesDeFila(datos, type, row) {
    if(type === "display" || type === "filter") {
        const filtrado = defineFilter(row);
        const id = datos.id_heka;
        const generacion_automatizada = ["automatico", "automaticoEmp"].includes(transportadoras[datos.transportadora || "SERVIENTREGA"].sistema());
        const showCloneAndDelete = datos.enviado ? "d-none" : "";
        const showDownloadAndRotulo = !datos.enviado ? "d-none" : "";
        const showMovements = datos.numeroGuia && datos.estado ? "" : "d-none";
        let buttons = `
        <div data-search="${datos.filter}"
        class="d-flex justify-content-around">
        `;

        const btnCrearSticker = `<button class="btn btn-primary btn-circle btn-sm mx-1 action" data-id="${id}"
        data-funcion="activar-desactivar"
        data-placement="right"
        id="crear_sticker${id}" title="Crear Sticker de la guía">
            <i class="fas fa-stamp"></i>
        </button>`
        
        const btnEdit = `<button class="btn btn-primary btn-circle btn-sm mx-1 action" data-id="${id}"
        data-funcion="activar-desactivar"
        data-placement="right"
        id="editar_guia${id}" title="Editar guía">
            <i class="fas fa-edit"></i>
        </button>`

        const btnMovimientos = `<button class="btn btn-primary btn-circle btn-sm mx-1 action" data-id="${id}"
        id="ver_movimientos${id}" data-toggle="modal" data-target="#modal-gestionarNovedad"
        data-placement="right"
        title="Revisar movimientos">
            <i class="fas fa-truck"></i>
        </button>`

        const btnDownloadDocs =  `<button class="btn btn-primary btn-circle btn-sm mx-1 action" data-id="${id}"
        data-placement="right"
        id="descargar_documento${id}" title="Descargar Documentos">
            <i class="fas fa-file-download"></i>
        </button>`;

        const btnRotulo = `<button class="btn btn-primary btn-circle btn-sm mx-1 action" data-id="${id}"
        data-funcion="activar-desactivar" data-activate="after" 
        data-placement="right"
        id="generar_rotulo${id}" title="Generar Rótulo">
            <i class="fas fa-ticket-alt"></i>
        </button>`

        const btnClone = `<button class="btn btn-success btn-circle btn-sm mx-1 action ${showCloneAndDelete}" data-id="${id}" 
        id="clonar_guia${id}" data-funcion="activar-desactivar" data-costo_envio="${datos.costo_envio}"
        data-placement="right"
        title="Clonar Guía">
            <i class="fas fa-clone"></i>
        </button>`;

        const btnDelete = `<button class="btn btn-danger btn-circle btn-sm mx-1 action ${showCloneAndDelete}" data-id="${id}" 
        id="eliminar_guia${id}" data-funcion="activar-desactivar" data-costo_envio="${datos.costo_envio}"
        data-placement="right"
        title="Eliminar Guía">
            <i class="fas fa-trash"></i>
        </button>`;
        
        //Bottón para re crear el sticker de guía.
        if(datos.numeroGuia && !datos.has_sticker && generacion_automatizada) {
            buttons += btnCrearSticker;
        }

        buttons += `
            <button class="btn btn-primary btn-circle btn-sm mx-1 action" data-id="${id}"
            id="ver_detalles${id}" data-toggle="modal" data-target="#modal-detallesGuias"
            data-placement="right"
            title="Detalles">
                <i class="fas fa-search-plus"></i>
            </button>
        `;

        //Botón para ver movimientos
        if (datos.numeroGuia && datos.estado) {
            buttons += btnMovimientos;
        }

        //Botones para descargar documentosy rótulos cuando accede a la condición
        //botones para clonar y eliminar guía cuando rechaza la condición.
        if(datos.enviado && !datos.enNovedad) {
            buttons += btnDownloadDocs + btnRotulo;
        }

        if(filtrado === pedido) {
            buttons += btnClone;
        }

        if(!datos.estado)
        buttons += btnDelete;
        

        // buttons += "<a href='javascript:void(0)' class='action text-trucate'>Ver más</a>"
        // buttons += btnEdit;
        buttons += "</div>";
        return buttons
    }
    return datos;
}

function accionEmpaque(datos, type, row) {
    if(type === "display" || type === "filter") {
        const filtrado = defineFilter(row);
        const {empacada, id_heka} = row;
        if (filtrado !== generada) return "";

        const res = `
        <div class="custom-control custom-switch action">
            <input type="checkbox" class="custom-control-input action" id="empacar-${id_heka}" ${empacada ? "checked" : ""}
            data-id="${id_heka}"
            data-funcion="activar-desactivar">
            <label class="custom-control-label action" for="empacar-${id_heka}">${empacada ? "Empacada" : "No empacada"}</label>
        </div>
        `;

        return res;
    } 
    return datos;
}

function accionGestNovedad(datos, type, row) {
    if(type === "display" || type === "filter") {
        const filtrado = defineFilter(row);
        const {numeroGuia, novedad_solucionada, transportadora, id_heka} = row;
        if (filtrado !== novedad) return "";

        const btnGestionar = novedad_solucionada 
        || transportadora === "INTERRAPIDISIMO" ? "Revisar" : "Gestionar";

        const res = `
        <div class="text-center">
            <button class="btn btn-sm btn-${novedad_solucionada ? "secondary" : "primary"} action" 
                id="gestionar-novedad-${id_heka}"
                data-id="${id_heka}"
                data-toggle="modal" data-target="#modal-gestionarNovedad"}>
                    ${btnGestionar}
            </button>
        </div>
        `;

        return res;
    } 
    return datos;
}

async function empacarMasivo(data, empacar) {
    const lista = data.toArray().filter(g => {
        return g.empacada != empacar;
    })

    if(empacar) lista.slice(0,51);

    // console.log(lista);
    // return;
    const enviado = lista.map(g => usuarioDoc.collection("guias").doc(g.id_heka).update({empacada: empacar}));

    await Promise.all(enviado);
    return lista.length
}