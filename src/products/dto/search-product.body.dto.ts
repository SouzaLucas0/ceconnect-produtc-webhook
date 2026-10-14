import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, ValidateNested } from 'class-validator';

class SearchArgsDto {
  @ApiProperty({ description: 'Descrição (ou parte dela) do produto', example: 'pneu da Bros' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  consulta: string;
}

// Só "args.consulta" é validado; os demais campos do payload são ignorados
export class SearchProductBodyDto {
  @ApiProperty({ type: SearchArgsDto })
  @ValidateNested()
  @Type(() => SearchArgsDto)
  args: SearchArgsDto;
}
