create table if not exists persona
(
    id                  uuid default uuid_generate_v4() not null
        primary key,
    nombre_completo     text                            not null,
    telefono            text,
    telefono_secundario text,
    calle               text,
    num_exterior        text,
    num_interior        text,
    ubicacion_id        uuid
        references mx_divisiones,
    id_type             text,
    id_number           text,
    proof_address_id    uuid
        references archivos,
    proof_id_id         uuid
        references archivos
);

alter table persona
    owner to postgres;

