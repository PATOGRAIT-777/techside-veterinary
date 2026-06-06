create table if not exists mascotas_alergias
(
    mascota_id uuid not null
        references mascotas
            on delete cascade,
    alergia_id uuid not null
        references catalogo_alergias
            on delete cascade,
    notas      text,
    primary key (mascota_id, alergia_id)
);

alter table mascotas_alergias
    owner to postgres;

