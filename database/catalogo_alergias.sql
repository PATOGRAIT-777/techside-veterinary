create table if not exists catalogo_alergias
(
    id     uuid default uuid_generate_v4() not null
        primary key,
    nombre text                            not null
        unique
);

alter table catalogo_alergias
    owner to postgres;

