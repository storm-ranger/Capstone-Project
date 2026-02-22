<?php

namespace Database\Seeders;

use App\Models\AreaGroup;
use App\Models\Province;
use App\Models\Area;
use App\Models\Client;
use App\Models\RateSetting;
use Illuminate\Database\Seeder;

class MasterDataSeeder extends Seeder
{
    public function run(): void
    {
        // Create Area Groups with Base Rates
        $areaGroups = [
            [
                'name' => 'Batangas Area (Except FPIP)',
                'code' => 'BTG-EXCL-FPIP',
                'description' => 'Lima, Sto. Tomas area in Batangas',
                'base_rate' => 3500.00,
            ],
            [
                'name' => 'Calamba, FPIP, Canlubang, LISP',
                'code' => 'CAL-FPIP-LISP',
                'description' => 'Calamba area, First Philippine Industrial Park, Canlubang, LISP zones',
                'base_rate' => 2750.00,
            ],
            [
                'name' => 'LTI, Mamplasan, Carmona, Biñan',
                'code' => 'LTI-MAMP-CARM',
                'description' => 'Laguna Technopark Inc, LIIP Mamplasan, Carmona, Biñan areas',
                'base_rate' => 2750.00,
            ],
            [
                'name' => 'Cavite - Rosario, Etc',
                'code' => 'CVT-ROSARIO',
                'description' => 'Carmona, General Trias, and other Cavite areas',
                'base_rate' => 4000.00,
            ],
        ];

        foreach ($areaGroups as $group) {
            AreaGroup::updateOrCreate(['code' => $group['code']], $group);
        }

        // Create Provinces
        $provinces = [
            ['name' => 'Batangas', 'code' => 'BTG'],
            ['name' => 'Cavite', 'code' => 'CVT'],
            ['name' => 'Laguna', 'code' => 'LGN'],
        ];

        foreach ($provinces as $province) {
            Province::updateOrCreate(['code' => $province['code']], $province);
        }

        $batangas = Province::where('code', 'BTG')->first();
        $cavite = Province::where('code', 'CVT')->first();
        $laguna = Province::where('code', 'LGN')->first();

        $btgExclFpip = AreaGroup::where('code', 'BTG-EXCL-FPIP')->first();
        $calFpipLisp = AreaGroup::where('code', 'CAL-FPIP-LISP')->first();
        $ltiMampCarm = AreaGroup::where('code', 'LTI-MAMP-CARM')->first();
        $cvtRosario = AreaGroup::where('code', 'CVT-ROSARIO')->first();

        // Create Areas with Area Group assignments
        $areas = [
            // Batangas Areas
            ['province_id' => $batangas->id, 'area_group_id' => $btgExclFpip->id, 'name' => 'LIMA', 'code' => 'LIMA'],
            ['province_id' => $batangas->id, 'area_group_id' => $calFpipLisp->id, 'name' => 'FPIP', 'code' => 'FPIP'],
            ['province_id' => $batangas->id, 'area_group_id' => $btgExclFpip->id, 'name' => 'STO. TOMAS', 'code' => 'STO-TOMAS'],
            
            // Cavite Areas
            ['province_id' => $cavite->id, 'area_group_id' => $ltiMampCarm->id, 'name' => 'CARMONA', 'code' => 'CARMONA'],
            ['province_id' => $cavite->id, 'area_group_id' => $cvtRosario->id, 'name' => 'GENERAL TRIAS', 'code' => 'GEN-TRIAS'],
            ['province_id' => $cavite->id, 'area_group_id' => $cvtRosario->id, 'name' => 'CAVITE', 'code' => 'CAVITE'],
            
            // Laguna Areas
            ['province_id' => $laguna->id, 'area_group_id' => $ltiMampCarm->id, 'name' => 'CARMELRAY', 'code' => 'CARMELRAY'],
            ['province_id' => $laguna->id, 'area_group_id' => $calFpipLisp->id, 'name' => 'CIP 2', 'code' => 'CIP2'],
            ['province_id' => $laguna->id, 'area_group_id' => $ltiMampCarm->id, 'name' => 'LTI', 'code' => 'LTI'],
            ['province_id' => $laguna->id, 'area_group_id' => $calFpipLisp->id, 'name' => 'LISP 1', 'code' => 'LISP1'],
            ['province_id' => $laguna->id, 'area_group_id' => $calFpipLisp->id, 'name' => 'LISP 2', 'code' => 'LISP2'],
            ['province_id' => $laguna->id, 'area_group_id' => $calFpipLisp->id, 'name' => 'CALAMBA', 'code' => 'CALAMBA'],
            ['province_id' => $laguna->id, 'area_group_id' => $ltiMampCarm->id, 'name' => 'LIIP', 'code' => 'LIIP'],
            ['province_id' => $laguna->id, 'area_group_id' => $calFpipLisp->id, 'name' => 'CPIP', 'code' => 'CPIP'],
            ['province_id' => $laguna->id, 'area_group_id' => $ltiMampCarm->id, 'name' => 'BIÑAN', 'code' => 'BINAN'],
            ['province_id' => $laguna->id, 'area_group_id' => $ltiMampCarm->id, 'name' => 'LTI ANNEX', 'code' => 'LTI-ANNEX'],
            ['province_id' => $laguna->id, 'area_group_id' => $calFpipLisp->id, 'name' => 'CANLUBANG', 'code' => 'CANLUBANG'],
            ['province_id' => $laguna->id, 'area_group_id' => $ltiMampCarm->id, 'name' => 'STA. CRUZ', 'code' => 'STA-CRUZ'],
            ['province_id' => $laguna->id, 'area_group_id' => $calFpipLisp->id, 'name' => 'CABUYAO', 'code' => 'CABUYAO'],
        ];

        foreach ($areas as $area) {
            Area::updateOrCreate(['code' => $area['code']], $area);
        }

        // Create Global Rate Settings (Drop Rates)
        $rateSettings = [
            [
                'name' => 'Drop Same Zone',
                'type' => 'drop_same_zone',
                'description' => 'Additional fee per drop within the same area/zone',
                'rate' => 250.00,
                'province_id' => null,
                'area_ids' => null,
                'is_active' => true,
            ],
            [
                'name' => 'Drop Other Zone',
                'type' => 'drop_other_zone',
                'description' => 'Additional fee per drop in a different area/zone',
                'rate' => 500.00,
                'province_id' => null,
                'area_ids' => null,
                'is_active' => true,
            ],
        ];

        foreach ($rateSettings as $setting) {
            RateSetting::updateOrCreate(
                ['type' => $setting['type'], 'name' => $setting['name']],
                $setting
            );
        }

        $this->command->info('Master data seeded successfully!');
        $this->command->info('- ' . count($areaGroups) . ' Area Groups created');
        $this->command->info('- ' . count($provinces) . ' Provinces created');
        $this->command->info('- ' . count($areas) . ' Areas created');
        $this->command->info('- ' . count($rateSettings) . ' Rate Settings created');
    }
}
