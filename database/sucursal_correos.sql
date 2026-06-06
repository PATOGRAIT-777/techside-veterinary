create table if not exists sucursal_correos
(
    id          uuid default uuid_generate_v4() not null
        primary key,
    sucursal_id uuid
        references sucursales
            on delete cascade,
    correo      text                            not null,
    etiqueta    text
);

alter table sucursal_correos
    owner to postgres;

