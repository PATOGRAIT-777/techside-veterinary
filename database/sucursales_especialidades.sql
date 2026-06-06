create table if not exists sucursales_especialidades
(
    sucursal_id     uuid not null
        references sucursales
            on delete cascade,
    especialidad_id uuid not null
        references especialidades
            on delete cascade,
    primary key (sucursal_id, especialidad_id)
);

alter table sucursales_especialidades
    owner to postgres;

