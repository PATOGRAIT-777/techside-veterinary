create table if not exists mascotas
(
    id                   uuid                     default uuid_generate_v4() not null
        primary key,
    propietario_id       uuid
        references usuarios
            on delete cascade,
    nombre               text                                                not null,
    raza_id              uuid
        references razas,
    color_id             uuid
        references colores,
    tipo_pelo_id         uuid
        references tipos_pelo,
    patron_pelo_id       uuid
        references patrones_pelo,
    comportamiento_id    uuid
        references comportamientos,
    fecha_nacimiento     date,
    sexo                 text
        constraint mascotas_sexo_check
            check (sexo = ANY (ARRAY ['Macho'::text, 'Hembra'::text])),
    peso                 numeric,
    esterilizado         boolean                  default false,
    ruac                 text,
    microchip            text,
    tatuaje              text,
    foto_perfil_id       uuid
        references archivos,
    carnet_vacunacion_id uuid
        references archivos,
    observaciones        text,
    creado_en            timestamp with time zone default now()
);

alter table mascotas
    owner to postgres;

