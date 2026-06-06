create table if not exists sucursales
(
    id                 uuid                     default uuid_generate_v4() not null
        primary key,
    nombre             text                                                not null,
    calle_numero       text,
    ubicacion_id       uuid
        references mx_divisiones,
    mapa_coords        text,
    descripcion_web    text,
    horario_atencion   text,
    foto_portada_id    uuid
        references archivos,
    galeria_fotos_ids  uuid[],
    telefono_principal text,
    whatsapp           text,
    activo             boolean                  default true,
    creado_en          timestamp with time zone default now()
);

alter table sucursales
    owner to postgres;

