create table if not exists categorias_producto
(
    id          uuid default uuid_generate_v4() not null
        primary key,
    nombre      text                            not null
        unique,
    descripcion text
);

alter table categorias_producto
    owner to postgres;

