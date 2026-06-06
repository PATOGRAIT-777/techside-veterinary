create table if not exists colores
(
    id     uuid default uuid_generate_v4() not null
        primary key,
    nombre text                            not null
        unique
);

alter table colores
    owner to postgres;

