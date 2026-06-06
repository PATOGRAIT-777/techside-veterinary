create table if not exists especialidades
(
    id          uuid default uuid_generate_v4() not null
        primary key,
    nombre      text                            not null
        unique,
    descripcion text
);

alter table especialidades
    owner to postgres;

