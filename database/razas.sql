create table if not exists razas
(
    id         uuid default uuid_generate_v4() not null
        primary key,
    especie_id uuid
        references especies
            on delete cascade,
    nombre     text                            not null,
    unique (especie_id, nombre)
);

alter table razas
    owner to postgres;

